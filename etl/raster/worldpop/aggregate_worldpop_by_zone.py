import os
from pathlib import Path

import geopandas as gpd
import numpy as np
import rasterio
import requests
from dotenv import load_dotenv
from rasterio.mask import mask
from sqlalchemy import create_engine


PROJECT_ROOT = Path(__file__).resolve().parents[3]

load_dotenv(PROJECT_ROOT / ".env")
load_dotenv(PROJECT_ROOT / "backend" / ".env", override=True)

DATABASE_URL = os.getenv(
    "DATABASE_URL",
    "postgresql://geodecisionnel:geodecisionnel@localhost:5433/geodecisionnel",
)

# Si le script est exécuté depuis le terminal local, le hostname Docker
# postgres-postgis n'est pas résolvable. On bascule vers localhost:5433.
if "@postgres-postgis:5432" in DATABASE_URL:
    DATABASE_URL = DATABASE_URL.replace("@postgres-postgis:5432", "@localhost:5433")

SQLALCHEMY_DATABASE_URL = DATABASE_URL.replace(
    "postgresql://",
    "postgresql+psycopg://",
    1,
)

BACKEND_API_URL = os.getenv("BACKEND_API_URL", "http://localhost:3001/api")

YEAR = os.getenv("WORLDPOP_YEAR", "2020")
COUNTRY = os.getenv("WORLDPOP_COUNTRY", "MDG")

# IMPORTANT :
# Pour calculer une vraie population exposée, on utilise le raster brut WorldPop,
# pas population_norm.tif ni population_worldpop_aligned.tif.
POPULATION_RASTER = (
    PROJECT_ROOT
    / "etl"
    / "data"
    / "raster"
    / "raw"
    / "worldpop"
    / f"{COUNTRY.lower()}_ppp_{YEAR}_UNadj.tif"
)

RISK_RASTER = (
    PROJECT_ROOT
    / "etl"
    / "data"
    / "raster"
    / "risk"
    / "risk_index.tif"
)

# Par défaut on calcule les trois niveaux.
# Pour tester plus vite :
# ZONE_LEVELS=region
# ZONE_LEVELS=region,district
ZONE_LEVELS = os.getenv("ZONE_LEVELS", "region,district,commune")

TABLES = {
    "region": "regions",
    "district": "districts",
    "commune": "communes",
}


def selected_tables():
    levels = [item.strip() for item in ZONE_LEVELS.split(",") if item.strip()]
    result = []

    for level in levels:
        if level not in TABLES:
            raise ValueError(f"Niveau inconnu dans ZONE_LEVELS : {level}")
        result.append((level, TABLES[level]))

    return result


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
    if geometry is None or geometry.is_empty:
        return np.array([], dtype="float32")

    geom = geometry

    if not geom.is_valid:
        geom = geom.buffer(0)

    geom_projected = gpd.GeoSeries([geom], crs="EPSG:4326").to_crs(src.crs).iloc[0]

    try:
        out_image, _ = mask(
            src,
            [geom_projected],
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

    geom = geometry

    if not geom.is_valid:
        geom = geom.buffer(0)

    gdf = gpd.GeoSeries([geom], crs="EPSG:4326").to_crs(epsg=3857)
    return float(gdf.area.iloc[0] / 1_000_000)


def upsert_indicator(payload: dict):
    url = f"{BACKEND_API_URL}/zone-indicators/upsert"

    response = requests.post(url, json=payload, timeout=60)

    if response.status_code >= 400:
        print("Erreur API:", response.status_code, response.text[:500])
        response.raise_for_status()

    return response.json()


def process_table(zone_type: str, table_name: str):
    print(f"\nTraitement {zone_type} depuis table {table_name}")

    zones = read_zones(table_name)

    print(f"Nombre de zones : {len(zones)}")

    with rasterio.open(POPULATION_RASTER) as pop_src, rasterio.open(RISK_RASTER) as risk_src:
        for position, (_, row) in enumerate(zones.iterrows(), start=1):
            geometry = row["geom"]

            population_values = mask_values(pop_src, geometry)
            risk_values = mask_values(risk_src, geometry)

            # WorldPop PPP est une population count par pixel.
            # On somme donc les pixels dans la zone.
            population_exposed = (
                float(population_values.sum())
                if population_values.size
                else 0.0
            )

            area_km2 = compute_area_km2(geometry)

            risk_mean = (
                float(risk_values.mean())
                if risk_values.size
                else None
            )

            risk_max = (
                float(risk_values.max())
                if risk_values.size
                else None
            )

            risk_level = classify_risk(risk_max)

            payload = {
                "zoneType": zone_type,
                "zoneId": str(row["id"]),
                "zoneNom": str(row["nom"]),
                "populationExposed": round(population_exposed, 2),
                "areaKm2": round(area_km2, 2),
                "riskMean": round(risk_mean, 2) if risk_mean is not None else None,
                "riskMax": round(risk_max, 2) if risk_max is not None else None,
                "riskLevel": risk_level,
            }

            upsert_indicator(payload)

            if position % 25 == 0 or position == len(zones):
                print(f"  {position}/{len(zones)} zones traitées")

    print(f"Terminé : {zone_type}")


def main():
    if not POPULATION_RASTER.exists():
        raise FileNotFoundError(
            f"Raster WorldPop brut introuvable : {POPULATION_RASTER}\n"
            "Lance d'abord download_worldpop.py"
        )

    if not RISK_RASTER.exists():
        raise FileNotFoundError(
            f"Raster risque introuvable : {RISK_RASTER}\n"
            "Lance weighted_overlay.py puis le masquage du raster de risque."
        )

    print(f"Population raster brut : {POPULATION_RASTER}")
    print(f"Risk raster : {RISK_RASTER}")
    print(f"Database URL : {DATABASE_URL}")
    print(f"Backend API : {BACKEND_API_URL}")
    print(f"Niveaux traités : {ZONE_LEVELS}")

    for zone_type, table_name in selected_tables():
        process_table(zone_type, table_name)

    print("\nCalcul des indicateurs zonaux terminé.")


if __name__ == "__main__":
    main()
