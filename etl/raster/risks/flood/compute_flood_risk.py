from pathlib import Path
import sys

import numpy as np
import rasterio

RISKS_DIR = Path(__file__).resolve().parents[1]
sys.path.append(str(RISKS_DIR))

from model_weights import load_model_weights


PROJECT_ROOT = Path(__file__).resolve().parents[4]

NORMALIZED_DIR = PROJECT_ROOT / "etl" / "data" / "raster" / "normalized"
FLOOD_RISK_DIR = PROJECT_ROOT / "etl" / "data" / "raster" / "risk" / "flood"

RAINFALL_PATH = NORMALIZED_DIR / "rainfall_norm.tif"
SLOPE_PATH = NORMALIZED_DIR / "slope_norm.tif"
POPULATION_PATH = NORMALIZED_DIR / "population_norm.tif"
LANDCOVER_PATH = NORMALIZED_DIR / "landcover_norm.tif"
RIVER_PROXIMITY_PATH = NORMALIZED_DIR / "river_proximity_norm.tif"

FLOOD_HAZARD_PATH = FLOOD_RISK_DIR / "flood_hazard_index.tif"
FLOOD_RISK_PATH = FLOOD_RISK_DIR / "flood_risk_index.tif"
FLOOD_CLASSIFIED_PATH = FLOOD_RISK_DIR / "flood_risk_classified.tif"


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
            "count": 1,
            "dtype": "float32",
            "nodata": -9999.0,
            "compress": "deflate",
        }
    )

    return cleaned


def read_raster(path: Path):
    if not path.exists():
        raise FileNotFoundError(f"Raster introuvable : {path}")

    with rasterio.open(path) as src:
        data = src.read(1).astype("float32")
        profile = src.profile.copy()
        nodata = src.nodata

    if nodata is not None:
        data = np.where(data == nodata, np.nan, data)

    data = np.where(data <= -9999, np.nan, data)
    data = np.where(data < 0, np.nan, data)

    return data, profile


def write_raster(path: Path, data: np.ndarray, profile: dict, nodata=-9999.0):
    path.parent.mkdir(parents=True, exist_ok=True)

    output = np.where(np.isfinite(data), data, nodata).astype("float32")

    with rasterio.open(path, "w", **clean_profile(profile)) as dst:
        dst.write(output, 1)


def classify_risk(risk_0_100: np.ndarray):
    classified = np.full(risk_0_100.shape, np.nan, dtype="float32")

    valid = np.isfinite(risk_0_100)

    classified[(risk_0_100 >= 0) & (risk_0_100 <= 30) & valid] = 1
    classified[(risk_0_100 > 30) & (risk_0_100 <= 60) & valid] = 2
    classified[(risk_0_100 > 60) & (risk_0_100 <= 80) & valid] = 3
    classified[(risk_0_100 > 80) & valid] = 4

    return classified


def assert_same_shape(reference: np.ndarray, *rasters: np.ndarray):
    for raster in rasters:
        if raster.shape != reference.shape:
            raise ValueError(
                f"Dimensions incompatibles : {raster.shape} au lieu de {reference.shape}"
            )


def main():
    rainfall, profile = read_raster(RAINFALL_PATH)
    slope, _ = read_raster(SLOPE_PATH)
    population, _ = read_raster(POPULATION_PATH)
    landcover, _ = read_raster(LANDCOVER_PATH)
    river_proximity, _ = read_raster(RIVER_PROXIMITY_PATH)

    assert_same_shape(rainfall, slope, population, landcover, river_proximity)

    weights = load_model_weights("FLOOD")
    hazard_weights = weights["HAZARD"]
    risk_weights = weights["RISK"]

    inverse_slope = 1 - slope

    valid_mask = (
        np.isfinite(rainfall)
        & np.isfinite(slope)
        & np.isfinite(population)
        & np.isfinite(landcover)
        & np.isfinite(river_proximity)
    )

    flood_hazard_0_1 = np.full(rainfall.shape, np.nan, dtype="float32")
    flood_risk_0_1 = np.full(rainfall.shape, np.nan, dtype="float32")

    flood_hazard_0_1[valid_mask] = (
        hazard_weights["rainfall"] * rainfall[valid_mask]
        + hazard_weights["inverse_slope"] * inverse_slope[valid_mask]
        + hazard_weights["river_proximity"] * river_proximity[valid_mask]
    )

    flood_risk_0_1[valid_mask] = (
        risk_weights["hazard"] * flood_hazard_0_1[valid_mask]
        + risk_weights["population"] * population[valid_mask]
        + risk_weights["landcover"] * landcover[valid_mask]
    )

    flood_hazard_0_100 = np.clip(flood_hazard_0_1 * 100, 0, 100).astype("float32")
    flood_risk_0_100 = np.clip(flood_risk_0_1 * 100, 0, 100).astype("float32")
    flood_classified = classify_risk(flood_risk_0_100)

    write_raster(FLOOD_HAZARD_PATH, flood_hazard_0_100, profile)
    write_raster(FLOOD_RISK_PATH, flood_risk_0_100, profile)
    write_raster(FLOOD_CLASSIFIED_PATH, flood_classified, profile)

    print(f"Aléa inondation généré : {FLOOD_HAZARD_PATH}")
    print(f"Risque inondation généré : {FLOOD_RISK_PATH}")
    print(f"Classes risque inondation générées : {FLOOD_CLASSIFIED_PATH}")

    print("Statistiques flood_risk_index :")
    print(f"  min  = {np.nanmin(flood_risk_0_100):.2f}")
    print(f"  max  = {np.nanmax(flood_risk_0_100):.2f}")
    print(f"  mean = {np.nanmean(flood_risk_0_100):.2f}")


if __name__ == "__main__":
    main()
