import os
from datetime import date, timedelta
from pathlib import Path

from dotenv import load_dotenv
from sqlalchemy import create_engine, text


PROJECT_ROOT = Path(__file__).resolve().parents[2]

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


RISK_TYPES = [
    ("GLOBAL", "Risque climatique global", "Indice composite global"),
    ("FLOOD", "Risque inondation", "Modèle spécifique inondation"),
    ("DROUGHT", "Risque sécheresse", "Modèle spécifique sécheresse"),
    ("LANDSLIDE", "Risque glissement de terrain", "Modèle spécifique glissement de terrain"),
    ("CYCLONE", "Risque cyclonique", "Modèle cyclonique historique IBTrACS"),
]


def execute(conn, sql: str, params: dict | None = None):
    conn.execute(text(sql), params or {})


def create_schema(conn):
    print("Création du schéma DWH...")

    execute(conn, "CREATE EXTENSION IF NOT EXISTS postgis;")
    execute(conn, "CREATE SCHEMA IF NOT EXISTS dwh;")

    execute(
        conn,
        """
        CREATE TABLE IF NOT EXISTS dwh.dim_time (
            time_key integer PRIMARY KEY,
            full_date date NOT NULL UNIQUE,
            year integer NOT NULL,
            quarter integer NOT NULL,
            month integer NOT NULL,
            month_name varchar(20) NOT NULL,
            day integer NOT NULL,
            week integer NOT NULL,
            day_of_week integer NOT NULL,
            day_name varchar(20) NOT NULL,
            is_weekend boolean NOT NULL
        );
        """,
    )

    execute(
        conn,
        """
        CREATE TABLE IF NOT EXISTS dwh.dim_zone (
            zone_key bigserial PRIMARY KEY,
            zone_type varchar(30) NOT NULL,
            zone_id uuid NOT NULL,
            zone_code varchar(100),
            zone_nom varchar(180),
            area_km2 double precision,
            geom geometry,
            UNIQUE(zone_type, zone_id)
        );
        """,
    )

    execute(
        conn,
        """
        CREATE INDEX IF NOT EXISTS idx_dim_zone_type
        ON dwh.dim_zone(zone_type);
        """,
    )

    execute(
        conn,
        """
        CREATE INDEX IF NOT EXISTS idx_dim_zone_geom
        ON dwh.dim_zone
        USING GIST(geom);
        """,
    )

    execute(
        conn,
        """
        CREATE TABLE IF NOT EXISTS dwh.dim_risk_type (
            risk_type_key bigserial PRIMARY KEY,
            risk_type varchar(50) NOT NULL UNIQUE,
            label varchar(160) NOT NULL,
            description text
        );
        """,
    )

    execute(
        conn,
        """
        CREATE TABLE IF NOT EXISTS dwh.dim_data_source (
            data_source_key bigserial PRIMARY KEY,
            code varchar(80) NOT NULL UNIQUE,
            name varchar(160) NOT NULL,
            category varchar(80),
            provider varchar(160),
            status varchar(50),
            last_success_at timestamp,
            last_sync_at timestamp
        );
        """,
    )

    execute(
        conn,
        """
        CREATE TABLE IF NOT EXISTS dwh.fact_risk_indicator (
            fact_risk_indicator_key bigserial PRIMARY KEY,
            time_key integer REFERENCES dwh.dim_time(time_key),
            zone_key bigint REFERENCES dwh.dim_zone(zone_key),
            risk_type_key bigint REFERENCES dwh.dim_risk_type(risk_type_key),
            risk_mean double precision,
            risk_max double precision,
            hazard_mean double precision,
            population_exposed double precision,
            area_km2 double precision,
            risk_level varchar(50),
            source_table varchar(80),
            operational_updated_at timestamp
        );
        """,
    )

    execute(
        conn,
        """
        CREATE INDEX IF NOT EXISTS idx_fact_risk_indicator_dims
        ON dwh.fact_risk_indicator(time_key, zone_key, risk_type_key);
        """,
    )

    execute(
        conn,
        """
        CREATE TABLE IF NOT EXISTS dwh.fact_climate_observation (
            fact_climate_observation_key bigserial PRIMARY KEY,
            time_key integer REFERENCES dwh.dim_time(time_key),
            zone_key bigint REFERENCES dwh.dim_zone(zone_key),
            data_source_key bigint REFERENCES dwh.dim_data_source(data_source_key),
            temperature_mean double precision,
            humidity_mean double precision,
            wind_speed_mean double precision,
            precipitation double precision,
            observed_date date,
            operational_updated_at timestamp
        );
        """,
    )

    execute(
        conn,
        """
        CREATE INDEX IF NOT EXISTS idx_fact_climate_observation_dims
        ON dwh.fact_climate_observation(time_key, zone_key, data_source_key);
        """,
    )

    execute(
        conn,
        """
        CREATE TABLE IF NOT EXISTS dwh.fact_raster_processing (
            fact_raster_processing_key bigserial PRIMARY KEY,
            time_key integer REFERENCES dwh.dim_time(time_key),
            raster_type varchar(100),
            raster_name varchar(180),
            file_path text,
            min_value double precision,
            max_value double precision,
            mean_value double precision,
            width integer,
            height integer,
            crs varchar(100),
            created_at timestamp,
            updated_at timestamp
        );
        """,
    )

    execute(
        conn,
        """
        CREATE INDEX IF NOT EXISTS idx_fact_raster_processing_time
        ON dwh.fact_raster_processing(time_key, raster_type);
        """,
    )


def reset_facts(conn):
    print("Réinitialisation partielle des tables de faits DWH...")

    # Les observations climatiques et les métadonnées raster sont reconstruites
    # depuis leurs tables opérationnelles historiques.
    execute(conn, "TRUNCATE TABLE dwh.fact_raster_processing RESTART IDENTITY;")
    execute(conn, "TRUNCATE TABLE dwh.fact_climate_observation RESTART IDENTITY;")

    # IMPORTANT :
    # On ne tronque plus fact_risk_indicator afin de conserver les snapshots
    # historiques nécessaires aux comparaisons de périodes.
    #
    # On supprime seulement les lignes correspondant aux dates actuellement
    # recalculées dans les tables opérationnelles, puis on les réinsère.
    execute(
        conn,
        '''
        DELETE FROM dwh.fact_risk_indicator f
        USING dwh.dim_time t
        WHERE f.time_key = t.time_key
          AND t.full_date IN (
            SELECT updated_at::date FROM zone_indicators WHERE updated_at IS NOT NULL
            UNION
            SELECT updated_at::date FROM zone_risk_indicators WHERE updated_at IS NOT NULL
          );
        '''
    )


def date_to_key(value: date):
    return int(value.strftime("%Y%m%d"))


def populate_dim_time(conn):
    print("Alimentation dim_time...")

    rows = conn.execute(
        text(
            """
            SELECT MIN(date_value) AS min_date, MAX(date_value) AS max_date
            FROM (
                SELECT updated_at::date AS date_value FROM zone_indicators
                UNION ALL
                SELECT updated_at::date AS date_value FROM zone_risk_indicators
                UNION ALL
                SELECT observed_date::date AS date_value FROM climate_observations
                UNION ALL
                SELECT created_at::date AS date_value FROM raster_layers
            ) dates
            WHERE date_value IS NOT NULL;
            """
        )
    ).mappings().first()

    today = date.today()

    min_date = rows["min_date"] if rows and rows["min_date"] else today - timedelta(days=365)
    max_date = rows["max_date"] if rows and rows["max_date"] else today

    # Petite marge pour les analyses futures.
    min_date = min_date - timedelta(days=7)
    max_date = max_date + timedelta(days=7)

    current = min_date

    while current <= max_date:
        time_key = date_to_key(current)

        execute(
            conn,
            """
            INSERT INTO dwh.dim_time (
                time_key,
                full_date,
                year,
                quarter,
                month,
                month_name,
                day,
                week,
                day_of_week,
                day_name,
                is_weekend
            )
            VALUES (
                :time_key,
                :full_date,
                :year,
                :quarter,
                :month,
                :month_name,
                :day,
                :week,
                :day_of_week,
                :day_name,
                :is_weekend
            )
            ON CONFLICT (time_key)
            DO UPDATE SET
                full_date = EXCLUDED.full_date,
                year = EXCLUDED.year,
                quarter = EXCLUDED.quarter,
                month = EXCLUDED.month,
                month_name = EXCLUDED.month_name,
                day = EXCLUDED.day,
                week = EXCLUDED.week,
                day_of_week = EXCLUDED.day_of_week,
                day_name = EXCLUDED.day_name,
                is_weekend = EXCLUDED.is_weekend;
            """,
            {
                "time_key": time_key,
                "full_date": current,
                "year": current.year,
                "quarter": ((current.month - 1) // 3) + 1,
                "month": current.month,
                "month_name": current.strftime("%B"),
                "day": current.day,
                "week": int(current.strftime("%V")),
                "day_of_week": current.isoweekday(),
                "day_name": current.strftime("%A"),
                "is_weekend": current.isoweekday() in (6, 7),
            },
        )

        current += timedelta(days=1)


def populate_dim_zone(conn):
    print("Alimentation dim_zone...")

    queries = [
        ("region", "regions"),
        ("district", "districts"),
        ("commune", "communes"),
    ]

    for zone_type, table_name in queries:
        execute(
            conn,
            f"""
            INSERT INTO dwh.dim_zone (
                zone_type,
                zone_id,
                zone_code,
                zone_nom,
                area_km2,
                geom
            )
            SELECT
                :zone_type,
                id,
                code,
                nom,
                ST_Area(ST_Transform(geom, 6933)) / 1000000.0 AS area_km2,
                geom
            FROM {table_name}
            WHERE geom IS NOT NULL
            ON CONFLICT (zone_type, zone_id)
            DO UPDATE SET
                zone_code = EXCLUDED.zone_code,
                zone_nom = EXCLUDED.zone_nom,
                area_km2 = EXCLUDED.area_km2,
                geom = EXCLUDED.geom;
            """,
            {
                "zone_type": zone_type,
            },
        )


def populate_dim_risk_type(conn):
    print("Alimentation dim_risk_type...")

    for risk_type, label, description in RISK_TYPES:
        execute(
            conn,
            """
            INSERT INTO dwh.dim_risk_type (
                risk_type,
                label,
                description
            )
            VALUES (
                :risk_type,
                :label,
                :description
            )
            ON CONFLICT (risk_type)
            DO UPDATE SET
                label = EXCLUDED.label,
                description = EXCLUDED.description;
            """,
            {
                "risk_type": risk_type,
                "label": label,
                "description": description,
            },
        )


def populate_dim_data_source(conn):
    print("Alimentation dim_data_source...")

    execute(
        conn,
        """
        INSERT INTO dwh.dim_data_source (
            code,
            name,
            category,
            provider,
            status,
            last_success_at,
            last_sync_at
        )
        SELECT
            code::text,
            name,
            category::text,
            provider,
            status::text,
            last_success_at,
            last_sync_at
        FROM data_sources
        ON CONFLICT (code)
        DO UPDATE SET
            name = EXCLUDED.name,
            category = EXCLUDED.category,
            provider = EXCLUDED.provider,
            status = EXCLUDED.status,
            last_success_at = EXCLUDED.last_success_at,
            last_sync_at = EXCLUDED.last_sync_at;
        """,
    )


def populate_fact_risk_indicator(conn):
    print("Alimentation fact_risk_indicator...")

    # Risque global depuis l'ancienne table opérationnelle zone_indicators.
    execute(
        conn,
        """
        INSERT INTO dwh.fact_risk_indicator (
            time_key,
            zone_key,
            risk_type_key,
            risk_mean,
            risk_max,
            hazard_mean,
            population_exposed,
            area_km2,
            risk_level,
            source_table,
            operational_updated_at
        )
        SELECT
            CAST(TO_CHAR(zi.updated_at::date, 'YYYYMMDD') AS integer) AS time_key,
            dz.zone_key,
            drt.risk_type_key,
            zi.risk_mean,
            zi.risk_max,
            NULL AS hazard_mean,
            zi.population_exposed,
            zi.area_km2,
            zi.risk_level::text,
            'zone_indicators' AS source_table,
            zi.updated_at
        FROM zone_indicators zi
        JOIN dwh.dim_zone dz
          ON dz.zone_type = zi.zone_type::text
         AND dz.zone_id = zi.zone_id
        JOIN dwh.dim_risk_type drt
          ON drt.risk_type = 'GLOBAL'
        WHERE zi.updated_at IS NOT NULL;
        """,
    )

    # Risques spécifiques depuis zone_risk_indicators.
    execute(
        conn,
        """
        INSERT INTO dwh.fact_risk_indicator (
            time_key,
            zone_key,
            risk_type_key,
            risk_mean,
            risk_max,
            hazard_mean,
            population_exposed,
            area_km2,
            risk_level,
            source_table,
            operational_updated_at
        )
        SELECT
            CAST(TO_CHAR(zri.updated_at::date, 'YYYYMMDD') AS integer) AS time_key,
            dz.zone_key,
            drt.risk_type_key,
            zri.risk_mean,
            zri.risk_max,
            zri.hazard_mean,
            zri.population_exposed,
            zri.area_km2,
            zri.risk_level::text,
            'zone_risk_indicators' AS source_table,
            zri.updated_at
        FROM zone_risk_indicators zri
        JOIN dwh.dim_zone dz
          ON dz.zone_type = zri.zone_type::text
         AND dz.zone_id = zri.zone_id
        JOIN dwh.dim_risk_type drt
          ON drt.risk_type = zri.risk_type::text
        WHERE zri.updated_at IS NOT NULL;
        """,
    )


def populate_fact_climate_observation(conn):
    print("Alimentation fact_climate_observation...")

    execute(
        conn,
        """
        INSERT INTO dwh.fact_climate_observation (
            time_key,
            zone_key,
            data_source_key,
            temperature_mean,
            humidity_mean,
            wind_speed_mean,
            precipitation,
            observed_date,
            operational_updated_at
        )
        SELECT
            CAST(TO_CHAR(co.observed_date::date, 'YYYYMMDD') AS integer) AS time_key,
            dz.zone_key,
            dds.data_source_key,
            co.temperature_mean,
            co.humidity_mean,
            co.wind_speed_mean,
            co.precipitation,
            co.observed_date,
            co.updated_at
        FROM climate_observations co
        JOIN dwh.dim_zone dz
          ON dz.zone_type = co.zone_type::text
         AND dz.zone_id = co.zone_id
        JOIN dwh.dim_data_source dds
          ON dds.code = co.source::text;
        """,
    )


def populate_fact_raster_processing(conn):
    print("Alimentation fact_raster_processing...")

    execute(
        conn,
        """
        INSERT INTO dwh.fact_raster_processing (
            time_key,
            raster_type,
            raster_name,
            file_path,
            min_value,
            max_value,
            mean_value,
            width,
            height,
            crs,
            created_at,
            updated_at
        )
        SELECT
            CAST(TO_CHAR(rl.updated_at::date, 'YYYYMMDD') AS integer) AS time_key,
            rl.type::text,
            rl.name,
            rl.file_path,
            rl.min_value,
            rl.max_value,
            rl.mean_value,
            rl.width,
            rl.height,
            rl.crs,
            rl.created_at,
            rl.updated_at
        FROM raster_layers rl
        WHERE rl.updated_at IS NOT NULL;
        """,
    )


def print_summary(conn):
    print("\nRésumé DWH :")

    tables = [
        "dwh.dim_time",
        "dwh.dim_zone",
        "dwh.dim_risk_type",
        "dwh.dim_data_source",
        "dwh.fact_risk_indicator",
        "dwh.fact_climate_observation",
        "dwh.fact_raster_processing",
    ]

    for table_name in tables:
        count = conn.execute(text(f"SELECT COUNT(*) AS total FROM {table_name}")).scalar()
        print(f"  {table_name}: {count}")


def main():
    print("Construction du data warehouse risque...")

    engine = create_engine(SQLALCHEMY_DATABASE_URL)

    with engine.begin() as conn:
        create_schema(conn)
        reset_facts(conn)
        populate_dim_time(conn)
        populate_dim_zone(conn)
        populate_dim_risk_type(conn)
        populate_dim_data_source(conn)
        populate_fact_risk_indicator(conn)
        populate_fact_climate_observation(conn)
        populate_fact_raster_processing(conn)
        print_summary(conn)

    print("Data warehouse risque construit avec succès.")


if __name__ == "__main__":
    main()
