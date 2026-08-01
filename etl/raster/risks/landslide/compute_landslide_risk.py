import os
from pathlib import Path

import numpy as np
import rasterio
from dotenv import load_dotenv


FILE_PATH = Path(__file__).resolve()
PROJECT_ROOT = FILE_PATH.parents[4]
ETL_ROOT = PROJECT_ROOT / "etl"

load_dotenv(PROJECT_ROOT / ".env")
load_dotenv(PROJECT_ROOT / "backend" / ".env", override=True)

NORMALIZED_DIR = ETL_ROOT / "data" / "raster" / "normalized"
OUTPUT_DIR = ETL_ROOT / "data" / "raster" / "risk" / "landslide"

RAINFALL_RASTER = NORMALIZED_DIR / "rainfall_norm.tif"
SLOPE_RASTER = NORMALIZED_DIR / "slope_norm.tif"
POPULATION_RASTER = NORMALIZED_DIR / "population_norm.tif"
LANDCOVER_RASTER = NORMALIZED_DIR / "landcover_norm.tif"

LANDSLIDE_HAZARD_RASTER = OUTPUT_DIR / "landslide_hazard_index.tif"
LANDSLIDE_RISK_RASTER = OUTPUT_DIR / "landslide_risk_index.tif"
LANDSLIDE_CLASSIFIED_RASTER = OUTPUT_DIR / "landslide_risk_classified.tif"

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

        nodata = src.nodata

        if nodata is not None:
            data = np.where(data == nodata, np.nan, data)

        data = np.where(data <= -9999, np.nan, data)
        data = np.where(data < 0, np.nan, data)

    return data, profile


def classify(values):
    classes = np.full(values.shape, NODATA, dtype="float32")
    valid = np.isfinite(values)

    classes[(values <= 30) & valid] = 1
    classes[(values > 30) & (values <= 60) & valid] = 2
    classes[(values > 60) & (values <= 80) & valid] = 3
    classes[(values > 80) & valid] = 4

    return classes


def reclass_landcover_for_landslide(landcover_norm):
    """
    Sensibilité V1 au glissement de terrain à partir de landcover_norm.

    Hypothèse :
    - Sol nu / zones clairsemées : forte sensibilité
    - Cultures / herbacées : moyenne à forte
    - Forêts : stabilisent partiellement les sols
    - Eau / zones humides : faible pertinence pour glissement
    - Bâti : vulnérabilité locale, mais pas forcément instabilité physique
    """
    sensitivity = np.full(landcover_norm.shape, np.nan, dtype="float32")
    valid = np.isfinite(landcover_norm)

    # Tree cover
    sensitivity[np.isclose(landcover_norm, 0.30, atol=0.03) & valid] = 0.35

    # Shrubland
    sensitivity[np.isclose(landcover_norm, 0.35, atol=0.03) & valid] = 0.55

    # Grassland
    sensitivity[np.isclose(landcover_norm, 0.40, atol=0.03) & valid] = 0.60

    # Cropland
    sensitivity[np.isclose(landcover_norm, 0.65, atol=0.03) & valid] = 0.65

    # Built-up
    sensitivity[np.isclose(landcover_norm, 0.90, atol=0.03) & valid] = 0.55

    # Bare / sparse vegetation
    sensitivity[np.isclose(landcover_norm, 0.55, atol=0.03) & valid] = 0.85

    # Water
    sensitivity[np.isclose(landcover_norm, 0.80, atol=0.03) & valid] = 0.10

    # Wetland
    sensitivity[np.isclose(landcover_norm, 0.85, atol=0.03) & valid] = 0.20

    # Mangrove
    sensitivity[np.isclose(landcover_norm, 0.70, atol=0.03) & valid] = 0.25

    # Valeur par défaut prudente.
    sensitivity[np.isnan(sensitivity) & valid] = 0.50

    return sensitivity


def write_raster(path, array, profile):
    path.parent.mkdir(parents=True, exist_ok=True)

    output = np.where(np.isfinite(array), array, NODATA).astype("float32")

    with rasterio.open(path, "w", **clean_profile(profile)) as dst:
        dst.write(output, 1)


def main():
    rainfall_norm, profile = read_normalized(RAINFALL_RASTER)
    slope_norm, _ = read_normalized(SLOPE_RASTER)
    population_norm, _ = read_normalized(POPULATION_RASTER)
    landcover_norm, _ = read_normalized(LANDCOVER_RASTER)

    landcover_sensitivity = reclass_landcover_for_landslide(landcover_norm)

    valid_mask = (
        np.isfinite(rainfall_norm)
        & np.isfinite(slope_norm)
        & np.isfinite(population_norm)
        & np.isfinite(landcover_sensitivity)
    )

    landslide_hazard = np.full(rainfall_norm.shape, np.nan, dtype="float32")
    landslide_risk = np.full(rainfall_norm.shape, np.nan, dtype="float32")

    landslide_hazard[valid_mask] = (
        0.45 * slope_norm[valid_mask]
        + 0.35 * rainfall_norm[valid_mask]
        + 0.20 * landcover_sensitivity[valid_mask]
    )

    landslide_risk[valid_mask] = (
        0.70 * landslide_hazard[valid_mask]
        + 0.20 * population_norm[valid_mask]
        + 0.10 * landcover_sensitivity[valid_mask]
    )

    landslide_hazard_index = np.clip(landslide_hazard * 100, 0, 100)
    landslide_risk_index = np.clip(landslide_risk * 100, 0, 100)
    landslide_classified = classify(landslide_risk_index)

    write_raster(LANDSLIDE_HAZARD_RASTER, landslide_hazard_index, profile)
    write_raster(LANDSLIDE_RISK_RASTER, landslide_risk_index, profile)
    write_raster(LANDSLIDE_CLASSIFIED_RASTER, landslide_classified, profile)

    valid = landslide_risk_index[np.isfinite(landslide_risk_index)]

    print(f"Aléa glissement généré : {LANDSLIDE_HAZARD_RASTER}")
    print(f"Risque glissement généré : {LANDSLIDE_RISK_RASTER}")
    print(f"Classes risque glissement générées : {LANDSLIDE_CLASSIFIED_RASTER}")

    if valid.size:
        print("Statistiques landslide_risk_index :")
        print(f"  min  = {float(valid.min()):.2f}")
        print(f"  max  = {float(valid.max()):.2f}")
        print(f"  mean = {float(valid.mean()):.2f}")

    print("Modèle glissement de terrain V1 terminé.")
    print(
        "Note méthodologique : V1 basée sur pente Copernicus DEM, pluie CHIRPS, "
        "sensibilité occupation du sol et exposition humaine."
    )


if __name__ == "__main__":
    main()
