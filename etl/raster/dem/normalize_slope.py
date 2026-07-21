from pathlib import Path

import numpy as np
import rasterio
from rasterio.enums import Resampling
from rasterio.vrt import WarpedVRT


PROJECT_ROOT = Path(__file__).resolve().parents[3]

SLOPE_PATH = PROJECT_ROOT / "etl" / "data" / "raster" / "processed" / "dem" / "slope_metric.tif"
REFERENCE_RASTER_PATH = PROJECT_ROOT / "etl" / "data" / "raster" / "normalized" / "rainfall_norm.tif"
SLOPE_NORM_PATH = PROJECT_ROOT / "etl" / "data" / "raster" / "normalized" / "slope_norm.tif"


def compute_min_max(path: Path):
    with rasterio.open(path) as src:
        nodata = src.nodata
        min_value = None
        max_value = None

        for _, window in src.block_windows(1):
            data = src.read(1, window=window).astype("float32")

            if nodata is not None:
                data = np.where(data == nodata, np.nan, data)

            valid = data[np.isfinite(data)]

            if valid.size == 0:
                continue

            current_min = float(valid.min())
            current_max = float(valid.max())

            min_value = current_min if min_value is None else min(min_value, current_min)
            max_value = current_max if max_value is None else max(max_value, current_max)

    if min_value is None or max_value is None:
        raise RuntimeError("Impossible de calculer min/max de la pente.")

    return min_value, max_value


def normalize(data: np.ndarray, min_value: float, max_value: float):
    if max_value == min_value:
        return np.zeros_like(data, dtype="float32")

    normalized = (data - min_value) / (max_value - min_value)
    return np.clip(normalized, 0, 1).astype("float32")


def clean_profile(profile: dict):
    """
    Nettoie le profil pour éviter les erreurs GeoTIFF :
    BLOCKXSIZE must be a multiple of 16.
    """
    cleaned = profile.copy()

    # On retire les options de tuilage héritées du raster de référence.
    cleaned.pop("blockxsize", None)
    cleaned.pop("blockysize", None)
    cleaned.pop("tiled", None)
    cleaned.pop("interleave", None)

    cleaned.update(
        {
            "driver": "GTiff",
            "dtype": "float32",
            "count": 1,
            "nodata": -9999.0,
            "compress": "lzw",
        }
    )

    return cleaned


def main():
    if not SLOPE_PATH.exists():
        raise FileNotFoundError(f"Pente introuvable : {SLOPE_PATH}")

    if not REFERENCE_RASTER_PATH.exists():
        raise FileNotFoundError(
            f"Raster de référence introuvable : {REFERENCE_RASTER_PATH}\n"
            "Lance d'abord generate_demo_rasters.py pour créer rainfall_norm.tif."
        )

    min_value, max_value = compute_min_max(SLOPE_PATH)

    print(f"Min pente : {min_value:.4f}")
    print(f"Max pente : {max_value:.4f}")

    SLOPE_NORM_PATH.parent.mkdir(parents=True, exist_ok=True)

    with rasterio.open(REFERENCE_RASTER_PATH) as ref:
        output_profile = clean_profile(ref.profile)

        with rasterio.open(SLOPE_PATH) as src:
            with WarpedVRT(
                src,
                crs=ref.crs,
                transform=ref.transform,
                width=ref.width,
                height=ref.height,
                resampling=Resampling.bilinear,
            ) as vrt:
                with rasterio.open(SLOPE_NORM_PATH, "w", **output_profile) as dst:
                    for _, window in ref.block_windows(1):
                        data = vrt.read(1, window=window).astype("float32")

                        src_nodata = vrt.nodata
                        if src_nodata is not None:
                            data = np.where(data == src_nodata, np.nan, data)

                        norm = normalize(data, min_value, max_value)
                        output = np.where(
                            np.isfinite(norm),
                            norm,
                            -9999.0,
                        ).astype("float32")

                        dst.write(output, 1, window=window)

    print(f"Pente normalisée alignée créée : {SLOPE_NORM_PATH}")
    print("Cette couche remplace la pente simulée dans le pipeline de risque.")


if __name__ == "__main__":
    main()
