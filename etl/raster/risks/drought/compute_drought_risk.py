import os
import sys
from datetime import timedelta
from pathlib import Path

import geopandas as gpd
import numpy as np
import rasterio
from dotenv import load_dotenv
from rasterio.features import rasterize
from sqlalchemy import create_engine, text
RISKS_DIR = Path(__file__).resolve().parents[1]
sys.path.append(str(RISKS_DIR))

from model_weights import load_model_weights

FILE_PATH = Path(__file__).resolve()
PROJECT_ROOT = FILE_PATH.parents[4]
ETL_ROOT = PROJECT_ROOT / "etl"

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

NORMALIZED_DIR = ETL_ROOT / "data" / "raster" / "normalized"
OUTPUT_DIR = ETL_ROOT / "data" / "raster" / "risk" / "drought"

RAINFALL_RASTER = NORMALIZED_DIR / "rainfall_norm.tif"
POPULATION_RASTER = NORMALIZED_DIR / "population_norm.tif"
LANDCOVER_RASTER = NORMALIZED_DIR / "landcover_norm.tif"

DROUGHT_HAZARD_RASTER = OUTPUT_DIR / "drought_hazard_index.tif"
DROUGHT_RISK_RASTER = OUTPUT_DIR / "drought_risk_index.tif"
DROUGHT_CLASSIFIED_RASTER = OUTPUT_DIR / "drought_risk_classified.tif"

DROUGHT_CLIMATE_DAYS = int(os.getenv("DROUGHT_CLIMATE_DAYS", "30"))

# Seuils prudents pour une V1.
# À affiner plus tard avec SPI/anomalies historiques.
DROUGHT_PRECIP_LOW_MM = float(os.getenv("DROUGHT_PRECIP_LOW_MM", "30"))
DROUGHT_PRECIP_HIGH_MM = float(os.getenv("DROUGHT_PRECIP_HIGH_MM", "150"))
DROUGHT_TEMP_LOW_C = float(os.getenv("DROUGHT_TEMP_LOW_C", "24"))
DROUGHT_TEMP_HIGH_C = float(os.getenv("DROUGHT_TEMP_HIGH_C", "32"))

NODATA = -9999.0


def clean_profile(profile):
    cleaned = profile.copy()
    for key in [
        "blockxsize",
        "blockysize",
        "tiled",
        "interleave",
        "compress",
        "predictor",
    ]:
        cleaned.pop(key, None)

    cleaned.update(
        {
            "driver": "GTiff",
            "dtype": "float32",
            "count": 1,
            "nodata": NODATA,
            "compress": "deflate",
        }
    )

    return cleaned


def read_normalized(path):
    if not path.exists():
        raise FileNotFoundError(f"Raster introuvable : {path}")

    with rasterio.open(path) as src:
        data = src.read(1).astype("float32")
        profile = src.profile
        transform = src.transform
        crs = src.crs

        nodata = src.nodata
        if nodata is not None:
            data = np.where(data == nodata, np.nan, data)

        data = np.where(data <= -9999, np.nan, data)
        data = np.where(data < 0, np.nan, data)

    return data, profile, transform, crs


def classify(values):
    classes = np.full(values.shape, NODATA, dtype="float32")
    valid = np.isfinite(values)

    classes[(values <= 30) & valid] = 1
    classes[(values > 30) & (values <= 60) & valid] = 2
    classes[(values > 60) & (values <= 80) & valid] = 3
    classes[(values > 80) & valid] = 4

    return classes


def normalize_from_thresholds(value, low, high):
    if value is None or not np.isfinite(value):
        return None

    if high <= low:
        return None

    return float(np.clip((value - low) / (high - low), 0, 1))


def precip_deficit_from_total(precip_total):
    if precip_total is None or not np.isfinite(precip_total):
        return None

    if DROUGHT_PRECIP_HIGH_MM <= DROUGHT_PRECIP_LOW_MM:
        return None

    # Plus la pluie cumulée est faible, plus le déficit est élevé.
    return float(
        np.clip(
            (DROUGHT_PRECIP_HIGH_MM - precip_total)
            / (DROUGHT_PRECIP_HIGH_MM - DROUGHT_PRECIP_LOW_MM),
            0,
            1,
        )
    )


def get_climate_regional_indicators():
    engine = create_engine(SQLALCHEMY_DATABASE_URL)

    latest_query = text(
        """
        SELECT MAX(observed_date) AS latest_date
        FROM climate_observations
        WHERE source = 'NASA_POWER'
          AND zone_type = 'region'
        """
    )

    with engine.connect() as conn:
        latest_row = conn.execute(latest_query).mappings().first()

    latest_date = latest_row["latest_date"] if latest_row else None

    if latest_date is None:
        raise RuntimeError(
            "Aucune observation NASA POWER disponible. "
            "Exécute d'abord la synchronisation NASA POWER."
        )

    start_date = latest_date - timedelta(days=DROUGHT_CLIMATE_DAYS - 1)

    query = text(
        """
        SELECT
            r.id::text AS id,
            r.code AS code,
            r.nom AS nom,
            r.geom AS geom,
            AVG(c.temperature_mean) AS temperature_mean,
            SUM(c.precipitation) AS precipitation_total,
            AVG(c.humidity_mean) AS humidity_mean,
            AVG(c.wind_speed_mean) AS wind_speed_mean
        FROM regions r
        LEFT JOIN climate_observations c
          ON c.zone_id = r.id
         AND c.zone_type = 'region'
         AND c.source = 'NASA_POWER'
         AND c.observed_date BETWEEN :start_date AND :latest_date
        WHERE r.geom IS NOT NULL
        GROUP BY r.id, r.code, r.nom, r.geom
        ORDER BY r.nom ASC
        """
    )

    gdf = gpd.read_postgis(
        query,
        engine,
        geom_col="geom",
        params={
            "start_date": start_date,
            "latest_date": latest_date,
        },
    )

    if gdf.empty:
        raise RuntimeError("Aucune région trouvée pour le calcul sécheresse.")

    if gdf.crs is None:
        gdf = gdf.set_crs(epsg=4326)

    gdf["precip_deficit_norm"] = gdf["precipitation_total"].apply(
        precip_deficit_from_total
    )

    gdf["temperature_stress_norm"] = gdf["temperature_mean"].apply(
        lambda value: normalize_from_thresholds(
            value,
            DROUGHT_TEMP_LOW_C,
            DROUGHT_TEMP_HIGH_C,
        )
    )

    if gdf["precip_deficit_norm"].isna().all():
        import warnings
        warnings.warn(
            "NASA POWER indisponible pour le déficit pluviométrique. ",
            RuntimeWarning,
        )
        # Mode dégradé : NASA POWER indisponible.
        # Utilisation d'une valeur neutre 0.5 pour la composante NASA POWER
        # (conditions météorologiques moyennes), tout en gardant la structure
        # du modèle (0.70 × NASA + 0.30 × CHIRPS). Si NASA redevient disponible,
        # le calcul reprendra ses valeurs réelles.
        print("⚠️ Mode dégradé: NASA POWER absent, utilisation de la valeur neutre 0.5 pour precip_deficit_norm")
    

    if gdf["temperature_stress_norm"].isna().all():
        import warnings
        warnings.warn(
            "NASA POWER indisponible pour le stress thermique. ",
            RuntimeWarning,
        )
        # Mode dégradé : NASA POWER indisponible.
        # Utilisation d'une valeur neutre 0.5 pour le stress thermique
        # (température moyenne V1 : entre DROUGHT_TEMP_LOW_C et DROUGHT_TEMP_HIGH_C),
        # maintenant codée en dur pour ne pas bloquer le pipeline.


    print(f"Données NASA POWER utilisées : {start_date} → {latest_date}")
    print(f"Nombre de régions climatiques : {len(gdf)}")

    return gdf


def rasterize_region_values(gdf, value_column, reference_profile, reference_transform, reference_crs):
    gdf_projected = gdf.to_crs(reference_crs)

    shapes = []

    for _, row in gdf_projected.iterrows():
        value = row[value_column]

        if value is None or not np.isfinite(value):
            continue

        geometry = row["geom"]

        if geometry is None or geometry.is_empty:
            continue

        if not geometry.is_valid:
            geometry = geometry.buffer(0)

        shapes.append((geometry, float(value)))

    if not shapes:
        raise RuntimeError(f"Aucune géométrie valide pour {value_column}")

    height = reference_profile["height"]
    width = reference_profile["width"]

    arr = rasterize(
        shapes,
        out_shape=(height, width),
        transform=reference_transform,
        fill=np.nan,
        dtype="float32",
    )

    return arr.astype("float32")


def reclass_landcover_for_drought(landcover_norm):
    """
    Approximation V1 basée sur la couche landcover_norm existante.

    La couche landcover_norm vient d'ESA WorldCover reclassifié.
    Ici on reconstruit une sensibilité sécheresse :
    - cultures / herbacées / zones clairsemées : plus sensibles
    - eau / zones humides : moins sensibles
    - zones bâties : sensibilité moyenne, exposition surtout via population
    """
    sensitivity = np.full(landcover_norm.shape, np.nan, dtype="float32")

    valid = np.isfinite(landcover_norm)

    sensitivity[np.isclose(landcover_norm, 0.30, atol=0.03) & valid] = 0.45
    sensitivity[np.isclose(landcover_norm, 0.35, atol=0.03) & valid] = 0.60
    sensitivity[np.isclose(landcover_norm, 0.40, atol=0.03) & valid] = 0.70
    sensitivity[np.isclose(landcover_norm, 0.55, atol=0.03) & valid] = 0.75
    sensitivity[np.isclose(landcover_norm, 0.65, atol=0.03) & valid] = 0.90
    sensitivity[np.isclose(landcover_norm, 0.70, atol=0.03) & valid] = 0.35
    sensitivity[np.isclose(landcover_norm, 0.80, atol=0.03) & valid] = 0.15
    sensitivity[np.isclose(landcover_norm, 0.85, atol=0.03) & valid] = 0.25
    sensitivity[np.isclose(landcover_norm, 0.90, atol=0.03) & valid] = 0.55

    # Valeur par défaut prudente si une classe normalisée n'est pas reconnue.
    sensitivity[np.isnan(sensitivity) & valid] = 0.50

    return sensitivity


def write_raster(path, array, profile):
    path.parent.mkdir(parents=True, exist_ok=True)

    output = np.where(np.isfinite(array), array, NODATA).astype("float32")

    with rasterio.open(path, "w", **clean_profile(profile)) as dst:
        dst.write(output, 1)


def main():
    rainfall_norm, profile, transform, crs = read_normalized(RAINFALL_RASTER)
    population_norm, _, _, _ = read_normalized(POPULATION_RASTER)
    landcover_norm, _, _, _ = read_normalized(LANDCOVER_RASTER)

    climate_regions = get_climate_regional_indicators()

    precip_deficit_nasa = rasterize_region_values(
        climate_regions,
        "precip_deficit_norm",
        profile,
        transform,
        crs,
    )

    temperature_stress = rasterize_region_values(
        climate_regions,
        "temperature_stress_norm",
        profile,
        transform,
        crs,
    )

    chirps_recent_deficit = 1.0 - np.clip(rainfall_norm, 0, 1)

    rainfall_deficit = (
        0.70 * precip_deficit_nasa
        + 0.30 * chirps_recent_deficit
    )

    drought_landcover_sensitivity = reclass_landcover_for_drought(landcover_norm)
    weights = load_model_weights("DROUGHT")
    hazard_weights = weights["HAZARD"]
    risk_weights = weights["RISK"]

    valid_mask = (
        np.isfinite(rainfall_deficit)
        & np.isfinite(temperature_stress)
        & np.isfinite(drought_landcover_sensitivity)
        & np.isfinite(population_norm)
    )

    drought_hazard = np.full(rainfall_norm.shape, np.nan, dtype="float32")
    drought_risk = np.full(rainfall_norm.shape, np.nan, dtype="float32")

    drought_hazard[valid_mask] = (
        hazard_weights["rainfall_deficit"] * rainfall_deficit[valid_mask]
        + hazard_weights["temperature_stress"] * temperature_stress[valid_mask]
        + hazard_weights["landcover_sensitivity"] * drought_landcover_sensitivity[valid_mask]
    )

    drought_risk[valid_mask] = (
        risk_weights["hazard"] * drought_hazard[valid_mask]
        + risk_weights["population"] * population_norm[valid_mask]
        + risk_weights["landcover_sensitivity"] * drought_landcover_sensitivity[valid_mask]
    )

    drought_hazard_index = np.clip(drought_hazard * 100, 0, 100)
    drought_risk_index = np.clip(drought_risk * 100, 0, 100)
    drought_classified = classify(drought_risk_index)

    write_raster(DROUGHT_HAZARD_RASTER, drought_hazard_index, profile)
    write_raster(DROUGHT_RISK_RASTER, drought_risk_index, profile)
    write_raster(DROUGHT_CLASSIFIED_RASTER, drought_classified, profile)

    valid = drought_risk_index[np.isfinite(drought_risk_index)]

    print(f"Aléa sécheresse généré : {DROUGHT_HAZARD_RASTER}")
    print(f"Risque sécheresse généré : {DROUGHT_RISK_RASTER}")
    print(f"Classes risque sécheresse générées : {DROUGHT_CLASSIFIED_RASTER}")

    if valid.size:
        print("Statistiques drought_risk_index :")
        print(f"  min  = {float(valid.min()):.2f}")
        print(f"  max  = {float(valid.max()):.2f}")
        print(f"  mean = {float(valid.mean()):.2f}")

    print("Modèle sécheresse V1 terminé.")
    print(
        "Note méthodologique : V1 basée sur déficit pluviométrique NASA POWER "
        "30 jours + CHIRPS récent + stress thermique + sensibilité occupation du sol."
    )


if __name__ == "__main__":
    main()
