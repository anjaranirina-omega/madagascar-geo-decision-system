from pathlib import Path

import numpy as np
import rasterio


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

    return data, profile


def write_raster(path: Path, data: np.ndarray, profile: dict, nodata=-9999.0):
    path.parent.mkdir(parents=True, exist_ok=True)

    output_profile = profile.copy()
    output_profile.update(
        {
            "driver": "GTiff",
            "count": 1,
            "dtype": "float32",
            "nodata": nodata,
            "compress": "lzw",
        }
    )

    output = np.where(np.isfinite(data), data, nodata).astype("float32")

    with rasterio.open(path, "w", **output_profile) as dst:
        dst.write(output, 1)


def classify_risk(risk_0_100: np.ndarray):
    classified = np.full(risk_0_100.shape, np.nan, dtype="float32")

    classified[(risk_0_100 >= 0) & (risk_0_100 <= 30)] = 1
    classified[(risk_0_100 > 30) & (risk_0_100 <= 60)] = 2
    classified[(risk_0_100 > 60) & (risk_0_100 <= 80)] = 3
    classified[(risk_0_100 > 80)] = 4

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

    assert_same_shape(rainfall, slope, population, landcover)

    inverse_slope = 1 - slope

    # Si un pixel est nodata dans une couche, il reste nodata.
    valid_mask = (
        np.isfinite(rainfall)
        & np.isfinite(slope)
        & np.isfinite(population)
        & np.isfinite(landcover)
    )

    flood_hazard_0_1 = np.full(rainfall.shape, np.nan, dtype="float32")
    flood_risk_0_1 = np.full(rainfall.shape, np.nan, dtype="float32")

    flood_hazard_0_1[valid_mask] = (
        0.60 * rainfall[valid_mask]
        + 0.40 * inverse_slope[valid_mask]
    )

    flood_risk_0_1[valid_mask] = (
        0.65 * flood_hazard_0_1[valid_mask]
        + 0.20 * population[valid_mask]
        + 0.15 * landcover[valid_mask]
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
