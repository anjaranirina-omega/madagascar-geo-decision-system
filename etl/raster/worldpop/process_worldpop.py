import os
from pathlib import Path

import numpy as np
import rasterio
from dotenv import load_dotenv
from rasterio.enums import Resampling
from rasterio.vrt import WarpedVRT


PROJECT_ROOT = Path(__file__).resolve().parents[3]

load_dotenv(PROJECT_ROOT / ".env")
load_dotenv(PROJECT_ROOT / "backend" / ".env")

YEAR = os.getenv("WORLDPOP_YEAR", "2020")
COUNTRY = os.getenv("WORLDPOP_COUNTRY", "MDG")

RAW_DIR = PROJECT_ROOT / "etl" / "data" / "raster" / "raw" / "worldpop"
PROCESSED_DIR = PROJECT_ROOT / "etl" / "data" / "raster" / "processed" / "worldpop"

FILENAME = f"{COUNTRY.lower()}_ppp_{YEAR}_UNadj.tif"

WORLDPOP_PATH = RAW_DIR / FILENAME
POPULATION_ALIGNED_PATH = PROCESSED_DIR / "population_worldpop_aligned.tif"

REFERENCE_CANDIDATES = [
    PROJECT_ROOT / "etl" / "data" / "raster" / "normalized" / "rainfall_norm.tif",
    PROJECT_ROOT / "etl" / "data" / "raster" / "normalized" / "slope_norm.tif",
    PROJECT_ROOT / "etl" / "data" / "raster" / "normalized" / "landcover_norm.tif",
]


def find_reference_raster():
    for path in REFERENCE_CANDIDATES:
        if path.exists():
            return path

    raise FileNotFoundError(
        "Aucun raster de référence trouvé. "
        "Il faut au moins rainfall_norm.tif, slope_norm.tif ou landcover_norm.tif."
    )


def main():
    if not WORLDPOP_PATH.exists():
        raise FileNotFoundError(
            f"WorldPop introuvable : {WORLDPOP_PATH}. "
            "Lance d'abord download_worldpop.py"
        )

    reference_path = find_reference_raster()

    print(f"WorldPop : {WORLDPOP_PATH}")
    print(f"Raster de référence : {reference_path}")

    with rasterio.open(reference_path) as ref:
        output_profile = ref.profile.copy()
        output_profile.update(
            {
                "driver": "GTiff",
                "dtype": "float32",
                "count": 1,
                "nodata": -9999.0,
                "compress": "lzw",
            }
        )

        PROCESSED_DIR.mkdir(parents=True, exist_ok=True)

        with rasterio.open(WORLDPOP_PATH) as src:
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

                data = np.where(data < 0, np.nan, data)
                output = np.where(np.isfinite(data), data, -9999.0).astype("float32")

        with rasterio.open(POPULATION_ALIGNED_PATH, "w", **output_profile) as dst:
            dst.write(output, 1)

    valid = output[output != -9999.0]

    print(f"Population alignée créée : {POPULATION_ALIGNED_PATH}")
    print(f"Min population : {valid.min():.4f}")
    print(f"Max population : {valid.max():.4f}")
    print(f"Mean population : {valid.mean():.4f}")


if __name__ == "__main__":
    main()
