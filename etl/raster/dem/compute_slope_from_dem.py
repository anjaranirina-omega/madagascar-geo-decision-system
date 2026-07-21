from pathlib import Path

import numpy as np
import rasterio
from rasterio.warp import reproject, Resampling


PROJECT_ROOT = Path(__file__).resolve().parents[3]

PROCESSED_DIR = PROJECT_ROOT / "etl" / "data" / "raster" / "processed" / "dem"

DEM_METRIC_PATH = PROCESSED_DIR / "dem_madagascar_metric.tif"
SLOPE_METRIC_PATH = PROCESSED_DIR / "slope_metric.tif"

SLOPE_NORM_PATH = PROJECT_ROOT / "etl" / "data" / "raster" / "normalized" / "slope_norm.tif"
REFERENCE_RASTER_PATH = PROJECT_ROOT / "etl" / "data" / "raster" / "normalized" / "rainfall_norm.tif"


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


def compute_slope_degrees(dem: np.ndarray, pixel_size_x: float, pixel_size_y: float) -> np.ndarray:
    dem = dem.astype("float32")

    dz_dy, dz_dx = np.gradient(dem, abs(pixel_size_y), abs(pixel_size_x))
    slope_radians = np.arctan(np.sqrt(dz_dx**2 + dz_dy**2))
    slope_degrees = np.degrees(slope_radians)

    return slope_degrees.astype("float32")


def write_raster(path: Path, data: np.ndarray, profile: dict, nodata=-9999.0):
    path.parent.mkdir(parents=True, exist_ok=True)

    output_profile = profile.copy()
    output_profile.update(
        {
            "driver": "GTiff",
            "dtype": "float32",
            "count": 1,
            "nodata": nodata,
            "compress": "lzw",
        }
    )

    output = np.where(np.isfinite(data), data, nodata).astype("float32")

    with rasterio.open(path, "w", **output_profile) as dst:
        dst.write(output, 1)


def compute_metric_slope():
    if not DEM_METRIC_PATH.exists():
        raise FileNotFoundError(
            f"DEM métrique introuvable : {DEM_METRIC_PATH}. "
            "Lance d'abord mosaic_dem.py"
        )

    with rasterio.open(DEM_METRIC_PATH) as src:
        dem = src.read(1).astype("float32")
        profile = src.profile.copy()
        nodata = src.nodata

        if nodata is not None:
            dem = np.where(dem == nodata, np.nan, dem)

        pixel_size_x, pixel_size_y = src.res

    slope = compute_slope_degrees(dem, pixel_size_x, pixel_size_y)
    write_raster(SLOPE_METRIC_PATH, slope, profile)

    print(f"Pente calculée : {SLOPE_METRIC_PATH}")
    print(f"  min  = {np.nanmin(slope):.2f}")
    print(f"  max  = {np.nanmax(slope):.2f}")
    print(f"  mean = {np.nanmean(slope):.2f}")


def create_normalized_slope():
    with rasterio.open(SLOPE_METRIC_PATH) as src:
        slope = src.read(1).astype("float32")
        slope_profile = src.profile.copy()
        nodata = src.nodata

        if nodata is not None:
            slope = np.where(slope == nodata, np.nan, slope)

    slope_norm_metric = normalize(slope)

    if REFERENCE_RASTER_PATH.exists():
        print(f"Alignement de slope_norm sur : {REFERENCE_RASTER_PATH}")

        with rasterio.open(REFERENCE_RASTER_PATH) as ref:
            destination = np.full((ref.height, ref.width), np.nan, dtype="float32")

            reproject(
                source=slope_norm_metric,
                destination=destination,
                src_transform=slope_profile["transform"],
                src_crs=slope_profile["crs"],
                dst_transform=ref.transform,
                dst_crs=ref.crs,
                resampling=Resampling.bilinear,
            )

            output_profile = ref.profile.copy()

        write_raster(SLOPE_NORM_PATH, destination, output_profile)
    else:
        print("Aucun raster de référence trouvé. Conservation de la grille métrique.")
        write_raster(SLOPE_NORM_PATH, slope_norm_metric, slope_profile)

    print(f"Pente normalisée créée : {SLOPE_NORM_PATH}")


def main():
    compute_metric_slope()
    create_normalized_slope()


if __name__ == "__main__":
    main()
