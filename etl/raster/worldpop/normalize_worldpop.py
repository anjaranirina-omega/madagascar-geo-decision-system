from pathlib import Path

import numpy as np
import rasterio


PROJECT_ROOT = Path(__file__).resolve().parents[3]

POPULATION_ALIGNED_PATH = PROJECT_ROOT / "etl" / "data" / "raster" / "processed" / "worldpop" / "population_worldpop_aligned.tif"
POPULATION_NORM_PATH = PROJECT_ROOT / "etl" / "data" / "raster" / "normalized" / "population_norm.tif"


def normalize(array: np.ndarray) -> np.ndarray:
    valid = np.isfinite(array)

    if not np.any(valid):
        return np.zeros_like(array, dtype="float32")

    min_value = np.nanmin(array[valid])
    max_value = np.nanmax(array[valid])

    if max_value == min_value:
        return np.zeros_like(array, dtype="float32")

    normalized = (array - min_value) / (max_value - min_value)
    return np.clip(normalized, 0, 1).astype("float32")


def main():
    if not POPULATION_ALIGNED_PATH.exists():
        raise FileNotFoundError(
            f"Population alignée introuvable : {POPULATION_ALIGNED_PATH}. "
            "Lance d'abord process_worldpop.py"
        )

    with rasterio.open(POPULATION_ALIGNED_PATH) as src:
        data = src.read(1).astype("float32")
        profile = src.profile.copy()
        nodata = src.nodata

        if nodata is not None:
            data = np.where(data == nodata, np.nan, data)

        data = np.where(data < 0, np.nan, data)

    population_norm = normalize(data)
    output = np.where(np.isfinite(population_norm), population_norm, -9999.0)

    profile.update(
        {
            "driver": "GTiff",
            "dtype": "float32",
            "count": 1,
            "nodata": -9999.0,
            "compress": "lzw",
        }
    )

    POPULATION_NORM_PATH.parent.mkdir(parents=True, exist_ok=True)

    with rasterio.open(POPULATION_NORM_PATH, "w", **profile) as dst:
        dst.write(output.astype("float32"), 1)

    print(f"population_norm.tif créé depuis WorldPop : {POPULATION_NORM_PATH}")
    print(f"Min norm : {np.nanmin(population_norm):.4f}")
    print(f"Max norm : {np.nanmax(population_norm):.4f}")
    print(f"Mean norm : {np.nanmean(population_norm):.4f}")


if __name__ == "__main__":
    main()
