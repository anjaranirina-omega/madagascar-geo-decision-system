from pathlib import Path

import numpy as np
import rasterio
from rasterio.enums import Resampling
from rasterio.vrt import WarpedVRT


PROJECT_ROOT = Path(__file__).resolve().parents[3]

WORLDCOVER_VRT_PATH = PROJECT_ROOT / "etl" / "data" / "raster" / "raw" / "worldcover" / "worldcover_madagascar.vrt"
PROCESSED_DIR = PROJECT_ROOT / "etl" / "data" / "raster" / "processed" / "worldcover"

LANDCOVER_ALIGNED_PATH = PROCESSED_DIR / "landcover_worldcover_aligned.tif"

REFERENCE_CANDIDATES = [
    PROJECT_ROOT / "etl" / "data" / "raster" / "normalized" / "rainfall_norm.tif",
    PROJECT_ROOT / "etl" / "data" / "raster" / "normalized" / "slope_norm.tif",
    PROJECT_ROOT / "etl" / "data" / "raster" / "normalized" / "population_norm.tif",
]


def find_reference_raster():
    for path in REFERENCE_CANDIDATES:
        if path.exists():
            return path

    raise FileNotFoundError(
        "Aucun raster de référence trouvé. "
        "Il faut au moins rainfall_norm.tif, slope_norm.tif ou population_norm.tif."
    )


def main():
    if not WORLDCOVER_VRT_PATH.exists():
        raise FileNotFoundError(
            f"VRT WorldCover introuvable : {WORLDCOVER_VRT_PATH}.\n"
            "Lance d'abord build_worldcover_vrt.py"
        )

    reference_path = find_reference_raster()

    print(f"WorldCover VRT : {WORLDCOVER_VRT_PATH}")
    print(f"Raster de référence : {reference_path}")

    with rasterio.open(reference_path) as ref:
        output_profile = ref.profile.copy()
        output_profile.update(
            {
                "driver": "GTiff",
                "dtype": "uint8",
                "count": 1,
                "nodata": 255,
                "compress": "lzw",
            }
        )

        PROCESSED_DIR.mkdir(parents=True, exist_ok=True)

        with rasterio.open(WORLDCOVER_VRT_PATH) as src:
            with WarpedVRT(
                src,
                crs=ref.crs,
                transform=ref.transform,
                width=ref.width,
                height=ref.height,
                resampling=Resampling.nearest,
            ) as vrt:
                data = vrt.read(1).astype("uint8")

                nodata = vrt.nodata
                if nodata is not None:
                    data = np.where(data == nodata, 255, data)

        with rasterio.open(LANDCOVER_ALIGNED_PATH, "w", **output_profile) as dst:
            dst.write(data, 1)

    unique_values = sorted(np.unique(data).tolist())

    print(f"WorldCover aligné créé : {LANDCOVER_ALIGNED_PATH}")
    print(f"Classes présentes : {unique_values}")


if __name__ == "__main__":
    main()
