import json
import os
import time
from datetime import date, timedelta
from pathlib import Path

import requests
from dotenv import load_dotenv
from sqlalchemy import create_engine, text

PROJECT_ROOT = Path(__file__).resolve().parents[3]

load_dotenv(PROJECT_ROOT / ".env")
load_dotenv(PROJECT_ROOT / "backend" / ".env", override=True)

DATABASE_URL = os.getenv(
    "DATABASE_URL",
    "postgresql://geodecisionnel:geodecisionnel@localhost:5433/geodecisionnel",
)

if "@postgres-postgis:5432" in DATABASE_URL:
    DATABASE_URL = DATABASE_URL.replace("@postgres-postgis:5432", "@localhost:5433")

SQLALCHEMY_DATABASE_URL = DATABASE_URL.replace(
    "postgresql://",
    "postgresql+psycopg://",
    1,
)

NASA_POWER_BASE_URL = os.getenv(
    "NASA_POWER_BASE_URL",
    "https://power.larc.nasa.gov/api/temporal/daily/point",
)

NASA_POWER_PARAMETERS = os.getenv(
    "NASA_POWER_PARAMETERS",
    "T2M,RH2M,WS2M,PRECTOTCORR",
)

NASA_POWER_DAYS = int(os.getenv("NASA_POWER_DAYS", "30"))

SOURCE = "NASA_POWER"


def default_dates():
    end = date.today() - timedelta(days=2)
    start = end - timedelta(days=NASA_POWER_DAYS - 1)

    return start.strftime("%Y%m%d"), end.strftime("%Y%m%d")


def get_date_range():
    start = os.getenv("NASA_POWER_START")
    end = os.getenv("NASA_POWER_END")

    if start and end:
        return start, end

    return default_dates()


def read_regions(engine):
    query = text(
        """
        SELECT
            id::text AS id,
            code,
            nom,
            ST_Y(ST_PointOnSurface(geom)) AS latitude,
            ST_X(ST_PointOnSurface(geom)) AS longitude
        FROM regions
        WHERE geom IS NOT NULL
        ORDER BY nom ASC
        """
    )

    with engine.connect() as conn:
        rows = conn.execute(query).mappings().all()

    return [dict(row) for row in rows]


def fetch_nasa_power(latitude, longitude, start, end):
    params = {
        "parameters": NASA_POWER_PARAMETERS,
        "community": "AG",
        "longitude": longitude,
        "latitude": latitude,
        "start": start,
        "end": end,
        "format": "JSON",
    }

    response = requests.get(NASA_POWER_BASE_URL, params=params, timeout=90)

    if response.status_code >= 400:
        raise RuntimeError(
            f"NASA POWER HTTP {response.status_code}: {response.text[:500]}"
        )

    return response.json()


def to_float_or_none(value):
    if value is None:
        return None

    try:
        numeric = float(value)
    except (TypeError, ValueError):
        return None

    # NASA POWER utilise parfois -999 comme valeur manquante.
    if numeric <= -900:
        return None

    return numeric


def upsert_observation(conn, payload):
    query = text(
        """
        INSERT INTO climate_observations (
            source,
            zone_type,
            zone_id,
            zone_code,
            zone_nom,
            latitude,
            longitude,
            observed_date,
            temperature_mean,
            humidity_mean,
            wind_speed_mean,
            precipitation,
            raw,
            created_at,
            updated_at
        )
        VALUES (
            :source,
            :zone_type,
            :zone_id,
            :zone_code,
            :zone_nom,
            :latitude,
            :longitude,
            :observed_date,
            :temperature_mean,
            :humidity_mean,
            :wind_speed_mean,
            :precipitation,
            CAST(:raw AS jsonb),
            NOW(),
            NOW()
        )
        ON CONFLICT (source, zone_type, zone_id, observed_date)
        DO UPDATE SET
            zone_code = EXCLUDED.zone_code,
            zone_nom = EXCLUDED.zone_nom,
            latitude = EXCLUDED.latitude,
            longitude = EXCLUDED.longitude,
            temperature_mean = EXCLUDED.temperature_mean,
            humidity_mean = EXCLUDED.humidity_mean,
            wind_speed_mean = EXCLUDED.wind_speed_mean,
            precipitation = EXCLUDED.precipitation,
            raw = EXCLUDED.raw,
            updated_at = NOW()
        """
    )

    conn.execute(query, payload)


def update_data_source_success(conn, start, end, regions_count, observations_count):
    metadata = {
        "lastSyncType": "regional_daily",
        "start": start,
        "end": end,
        "regionsCount": regions_count,
        "observationsCount": observations_count,
        "parameters": NASA_POWER_PARAMETERS.split(","),
    }

    query = text(
        """
        UPDATE data_sources
        SET
            status = 'CONNECTED',
            last_sync_at = NOW(),
            last_success_at = NOW(),
            last_error_message = NULL,
            metadata = COALESCE(metadata, '{}'::jsonb) || CAST(:metadata AS jsonb),
            updated_at = NOW()
        WHERE code = 'NASA_POWER'
        """
    )

    conn.execute(query, {"metadata": json.dumps(metadata)})


def update_data_source_failed(conn, error_message):
    query = text(
        """
        UPDATE data_sources
        SET
            status = 'FAILED',
            last_sync_at = NOW(),
            last_error_at = NOW(),
            last_error_message = :error_message,
            updated_at = NOW()
        WHERE code = 'NASA_POWER'
        """
    )

    conn.execute(query, {"error_message": error_message[:1000]})


def process_region(conn, region, start, end):
    print(
        f"NASA POWER région {region['nom']} "
        f"({region['latitude']:.4f}, {region['longitude']:.4f})"
    )

    data = fetch_nasa_power(region["latitude"], region["longitude"], start, end)

    parameters = data.get("properties", {}).get("parameter", {})

    t2m = parameters.get("T2M", {})
    rh2m = parameters.get("RH2M", {})
    ws2m = parameters.get("WS2M", {})
    prectotcorr = parameters.get("PRECTOTCORR", {})

    all_dates = sorted(set(t2m) | set(rh2m) | set(ws2m) | set(prectotcorr))

    count = 0

    for yyyymmdd in all_dates:
        observed_date = (
            f"{yyyymmdd[0:4]}-{yyyymmdd[4:6]}-{yyyymmdd[6:8]}"
        )

        temperature_mean = to_float_or_none(t2m.get(yyyymmdd))
        humidity_mean = to_float_or_none(rh2m.get(yyyymmdd))
        wind_speed_mean = to_float_or_none(ws2m.get(yyyymmdd))
        precipitation = to_float_or_none(prectotcorr.get(yyyymmdd))

        # NASA POWER peut publier une date récente avec des valeurs manquantes.
        # On ignore les lignes totalement vides pour éviter d'afficher une date
        # récente mais inexploitable dans le dashboard.
        if (
            temperature_mean is None
            and humidity_mean is None
            and wind_speed_mean is None
            and precipitation is None
        ):
            continue

        payload = {
            "source": SOURCE,
            "zone_type": "region",
            "zone_id": region["id"],
            "zone_code": region["code"],
            "zone_nom": region["nom"],
            "latitude": region["latitude"],
            "longitude": region["longitude"],
            "observed_date": observed_date,
            "temperature_mean": temperature_mean,
            "humidity_mean": humidity_mean,
            "wind_speed_mean": wind_speed_mean,
            "precipitation": precipitation,
            "raw": json.dumps(
                {
                    "T2M": t2m.get(yyyymmdd),
                    "RH2M": rh2m.get(yyyymmdd),
                    "WS2M": ws2m.get(yyyymmdd),
                    "PRECTOTCORR": prectotcorr.get(yyyymmdd),
                }
            ),
        }

        upsert_observation(conn, payload)
        count += 1

    print(f"  Observations enregistrées : {count}")

    return count


def main():
    start, end = get_date_range()

    print("Synchronisation NASA POWER")
    print(f"Période : {start} → {end}")
    print(f"Paramètres : {NASA_POWER_PARAMETERS}")

    engine = create_engine(SQLALCHEMY_DATABASE_URL)

    total_observations = 0

    try:
        regions = read_regions(engine)

        if not regions:
            raise RuntimeError("Aucune région trouvée en base.")

        print(f"Régions à synchroniser : {len(regions)}")

        with engine.begin() as conn:
            for index, region in enumerate(regions, start=1):
                print(f"\n[{index}/{len(regions)}]")
                total_observations += process_region(conn, region, start, end)
                time.sleep(0.25)

            update_data_source_success(
                conn,
                start=start,
                end=end,
                regions_count=len(regions),
                observations_count=total_observations,
            )

        print("\nSynchronisation NASA POWER terminée.")
        print(f"Observations totales : {total_observations}")

    except Exception as exc:
        error_message = str(exc)

        with engine.begin() as conn:
            update_data_source_failed(conn, error_message)

        raise


if __name__ == "__main__":
    main()
