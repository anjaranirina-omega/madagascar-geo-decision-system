from pathlib import Path

import numpy as np
import rasterio


PROJECT_ROOT = Path(__file__).resolve().parents[3]

RAINFALL_TOTAL_PATH = PROJECT_ROOT / "etl" / "data" / "raster" / "processed" / "chirps" / "rainfall_chirps_total.tif"
RAINFALL_NORM_PATH = PROJECT_ROOT / "etl" / "data" / "raster" / "normalized" / "rainfall_norm.tif"


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
    if not RAINFALL_TOTAL_PATH.exists():
        raise FileNotFoundError(
            f"Raster pluie cumulée introuvable : {RAINFALL_TOTAL_PATH}. "
            "Lance d'abord process_chirps.py"
        )

    with rasterio.open(RAINFALL_TOTAL_PATH) as src:
        data = src.read(1).astype("float32")
        profile = src.profile.copy()
        nodata = src.nodata

        if nodata is not None:
            data = np.where(data == nodata, np.nan, data)

    rainfall_norm = normalize(data)
    output = np.where(np.isfinite(rainfall_norm), rainfall_norm, -9999.0)

    profile.update(
        {
            "driver": "GTiff",
            "dtype": "float32",
            "count": 1,
            "nodata": -9999.0,
            "compress": "lzw",
        }
    )

    RAINFALL_NORM_PATH.parent.mkdir(parents=True, exist_ok=True)

    with rasterio.open(RAINFALL_NORM_PATH, "w", **profile) as dst:
        dst.write(output.astype("float32"), 1)

    print(f"rainfall_norm.tif créé depuis CHIRPS : {RAINFALL_NORM_PATH}")
    print(f"Min norm : {np.nanmin(rainfall_norm):.4f}")
    print(f"Max norm : {np.nanmax(rainfall_norm):.4f}")
    print(f"Mean norm : {np.nanmean(rainfall_norm):.4f}")


if __name__ == "__main__":
    main()
