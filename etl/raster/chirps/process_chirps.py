from pathlib import Path

import numpy as np
import rasterio
from rasterio.enums import Resampling
from rasterio.vrt import WarpedVRT


PROJECT_ROOT = Path(__file__).resolve().parents[3]

RAW_DIR = PROJECT_ROOT / "etl" / "data" / "raster" / "raw" / "chirps"
PROCESSED_DIR = PROJECT_ROOT / "etl" / "data" / "raster" / "processed" / "chirps"

RAINFALL_TOTAL_PATH = PROCESSED_DIR / "rainfall_chirps_total.tif"

REFERENCE_CANDIDATES = [
    PROJECT_ROOT / "etl" / "data" / "raster" / "normalized" / "slope_norm.tif",
    PROJECT_ROOT / "etl" / "data" / "raster" / "normalized" / "population_norm.tif",
    PROJECT_ROOT / "etl" / "data" / "raster" / "normalized" / "landcover_norm.tif",
]


def find_reference_raster():
    for path in REFERENCE_CANDIDATES:
        if path.exists():
            return path

    raise FileNotFoundError(
        "Aucun raster de référence trouvé. "
        "Il faut au moins slope_norm.tif, population_norm.tif ou landcover_norm.tif."
    )


def list_chirps_files():
    files = sorted(RAW_DIR.glob("chirps-v2.0.*.tif"))

    if not files:
        raise FileNotFoundError(
            f"Aucun fichier CHIRPS .tif trouvé dans {RAW_DIR}. "
            "Lance d'abord download_chirps.py"
        )

    return files


def main():
    reference_path = find_reference_raster()
    chirps_files = list_chirps_files()

    print(f"Raster de référence : {reference_path}")
    print(f"Nombre de fichiers CHIRPS : {len(chirps_files)}")

    with rasterio.open(reference_path) as ref:
        total = np.zeros((ref.height, ref.width), dtype="float32")
        valid_count = np.zeros((ref.height, ref.width), dtype="uint16")

        for chirps_path in chirps_files:
            print(f"Traitement : {chirps_path.name}")

            with rasterio.open(chirps_path) as src:
                with WarpedVRT(
                    src,
                    crs=ref.crs,
                    transform=ref.transform,
                    width=ref.width,
                    height=ref.height,
                    resampling=Resampling.bilinear,
                ) as vrt:
                    data = vrt.read(1).astype("float32")

                    nodata = vrt.nodata
                    if nodata is not None:
                        data = np.where(data == nodata, np.nan, data)

                    # CHIRPS peut contenir des valeurs négatives pour NoData selon les versions
                    data = np.where(data < 0, np.nan, data)

                    valid = np.isfinite(data)

                    total[valid] += data[valid]
                    valid_count[valid] += 1

        total = np.where(valid_count > 0, total, -9999.0).astype("float32")

        profile = ref.profile.copy()
        profile.update(
            {
                "driver": "GTiff",
                "dtype": "float32",
                "count": 1,
                "nodata": -9999.0,
                "compress": "lzw",
            }
        )

    PROCESSED_DIR.mkdir(parents=True, exist_ok=True)

    with rasterio.open(RAINFALL_TOTAL_PATH, "w", **profile) as dst:
        dst.write(total, 1)

    print(f"Cumul CHIRPS créé : {RAINFALL_TOTAL_PATH}")
    print(f"Min pluie : {np.nanmin(np.where(total == -9999.0, np.nan, total)):.2f}")
    print(f"Max pluie : {np.nanmax(np.where(total == -9999.0, np.nan, total)):.2f}")
    print(f"Mean pluie : {np.nanmean(np.where(total == -9999.0, np.nan, total)):.2f}")


if __name__ == "__main__":
    main()
