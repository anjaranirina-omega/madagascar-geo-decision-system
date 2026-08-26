import os
from pathlib import Path

import geopandas as gpd
import numpy as np
import rasterio
import requests
from dotenv import load_dotenv
from rasterio.mask import mask
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

BACKEND_API_URL = os.getenv("BACKEND_API_URL", "http://localhost:3001/api")


def ensure_raster_layer_id_column(conn):
    """Ajoute la colonne raster_layer_id si elle n'existe pas encore."""
    result = conn.execute(
        text("""
            SELECT 1 FROM information_schema.columns
            WHERE table_name = 'zone_indicators'
              AND column_name = 'raster_layer_id'
            LIMIT 1;
        """)
    )
    if result.fetchone() is None:
        conn.execute(
            text("ALTER TABLE zone_indicators ADD COLUMN raster_layer_id uuid;")
        )
        print("  Colonne raster_layer_id ajoutée à zone_indicators.")


def get_active_raster_layer_id(conn, raster_type: str) -> str | None:
    """Retourne l'id de la version active du raster demandé, ou None."""
    result = conn.execute(
        text("""
            SELECT id FROM raster_layers
            WHERE type = :type AND is_active = true
            ORDER BY updated_at DESC
            LIMIT 1;
        """),
        {"type": raster_type},
    )
    row = result.mappings().first()
    return row["id"] if row else None


POPULATION_RASTER = (
    PROJECT_ROOT
    / "etl"
    / "data"
    / "raster"
    / "processed"
    / "worldpop"
    / "population_worldpop_aligned.tif"
)

RISK_RASTER = (
    PROJECT_ROOT
    / "etl"
    / "data"
    / "raster"
    / "risk"
    / "risk_index.tif"
)

TABLES = [
    ("region", "regions"),
    ("district", "districts"),
    ("commune", "communes"),
]


def classify_risk(value: float | None):
    if value is None:
        return None

    if value <= 30:
        return "FAIBLE"

    if value <= 60:
        return "MOYEN"

    if value <= 80:
        return "ELEVE"

    return "CRITIQUE"


def read_zones(table_name: str) -> gpd.GeoDataFrame:
    engine = create_engine(SQLALCHEMY_DATABASE_URL)

    query = f"""
    SELECT id, code, nom, geom
    FROM {table_name}
    WHERE geom IS NOT NULL
    """

    gdf = gpd.read_postgis(query, engine, geom_col="geom")

    if "geom" in gdf.columns:
        gdf = gdf.set_geometry("geom")

    if gdf.crs is None:
        gdf = gdf.set_crs(epsg=4326)

    return gdf


def mask_values(src, geometry):
    geom = geometry

    if geom is None or geom.is_empty:
        return np.array([], dtype="float32")

    if not geom.is_valid:
        geom = geom.buffer(0)

    geom = gpd.GeoSeries([geom], crs="EPSG:4326").to_crs(src.crs).iloc[0]

    try:
        out_image, _ = mask(
            src,
            [geom],
            crop=True,
            nodata=src.nodata if src.nodata is not None else -9999.0,
            filled=True,
        )
    except ValueError:
        return np.array([], dtype="float32")

    data = out_image[0].astype("float32")

    nodata = src.nodata
    if nodata is not None:
        data = np.where(data == nodata, np.nan, data)

    data = np.where(data <= -9999, np.nan, data)
    data = np.where(data < 0, np.nan, data)

    return data[np.isfinite(data)]


def compute_area_km2(geometry):
    if geometry is None or geometry.is_empty:
        return 0.0

    gdf = gpd.GeoSeries([geometry], crs="EPSG:4326").to_crs(epsg=3857)
    return float(gdf.area.iloc[0] / 1_000_000)


def upsert_indicator(payload: dict):
    url = f"{BACKEND_API_URL}/zone-indicators/upsert"

    response = requests.post(url, json=payload, timeout=30)

    if response.status_code >= 400:
        print("Erreur API:", response.status_code, response.text[:500])
        response.raise_for_status()

    return response.json()


def process_table(zone_type: str, table_name: str, raster_layer_id: str | None):
    print(f"\nTraitement {zone_type} depuis table {table_name}")

    zones = read_zones(table_name)

    print(f"Nombre de zones : {len(zones)}")

    with rasterio.open(POPULATION_RASTER) as pop_src, rasterio.open(RISK_RASTER) as risk_src:
        for idx, row in zones.iterrows():
            geometry = row["geom"]

            population_values = mask_values(pop_src, geometry)
            risk_values = mask_values(risk_src, geometry)

            population_exposed = float(population_values.sum()) if population_values.size else 0.0
            area_km2 = compute_area_km2(geometry)

            risk_mean = float(risk_values.mean()) if risk_values.size else None
            risk_max = float(risk_values.max()) if risk_values.size else None
            risk_level = classify_risk(risk_max)

            payload = {
                "zoneType": zone_type,
                "zoneId": str(row.id),
                "zoneNom": str(row.nom),
                "populationExposed": round(population_exposed, 2),
                "areaKm2": round(area_km2, 2),
                "riskMean": round(risk_mean, 2) if risk_mean is not None else None,
                "riskMax": round(risk_max, 2) if risk_max is not None else None,
                "riskLevel": risk_level,
                "rasterLayerId": raster_layer_id,
            }

            upsert_indicator(payload)

            if (idx + 1) % 25 == 0:
                print(f"  {idx + 1}/{len(zones)} zones traitées")

    print(f"Terminé : {zone_type}")


def main():
    if not POPULATION_RASTER.exists():
        raise FileNotFoundError(
            f"Population raster introuvable : {POPULATION_RASTER}"
        )

    if not RISK_RASTER.exists():
        raise FileNotFoundError(
            f"Risk raster introuvable : {RISK_RASTER}"
        )

    print(f"Population raster : {POPULATION_RASTER}")
    print(f"Risk raster : {RISK_RASTER}")
    print(f"Backend API : {BACKEND_API_URL}")

    engine = create_engine(SQLALCHEMY_DATABASE_URL)

    with engine.begin() as conn:
        ensure_raster_layer_id_column(conn)
        raster_layer_id = get_active_raster_layer_id(conn, "RISK_INDEX")
        if raster_layer_id:
            print(f"  Raster layer ID (RISK_INDEX) : {raster_layer_id}")
        else:
            print("  Avertissement : aucun raster_layer_id actif trouvé pour RISK_INDEX")

        for zone_type, table_name in TABLES:
            process_table(zone_type, table_name, raster_layer_id)

    print("Calcul des indicateurs zonaux terminé.")


if __name__ == "__main__":
    main()
