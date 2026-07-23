from pathlib import Path

import numpy as np
import rasterio


PROJECT_ROOT = Path(__file__).resolve().parents[3]

LANDCOVER_ALIGNED_PATH = PROJECT_ROOT / "etl" / "data" / "raster" / "processed" / "worldcover" / "landcover_worldcover_aligned.tif"
LANDCOVER_NORM_PATH = PROJECT_ROOT / "etl" / "data" / "raster" / "normalized" / "landcover_norm.tif"


# ESA WorldCover classes → score de contribution au risque
# 0 = faible contribution
# 1 = forte contribution
RECLASSIFICATION = {
    10: 0.30,  # Tree cover
    20: 0.35,  # Shrubland
    30: 0.40,  # Grassland
    40: 0.65,  # Cropland
    50: 0.90,  # Built-up
    60: 0.55,  # Bare / sparse vegetation
    70: 0.20,  # Snow and ice
    80: 0.80,  # Permanent water bodies
    90: 0.85,  # Herbaceous wetland
    95: 0.70,  # Mangroves
    100: 0.30, # Moss and lichen
}


def main():
    if not LANDCOVER_ALIGNED_PATH.exists():
        raise FileNotFoundError(
            f"WorldCover aligné introuvable : {LANDCOVER_ALIGNED_PATH}.\n"
            "Lance d'abord process_worldcover.py"
        )

    with rasterio.open(LANDCOVER_ALIGNED_PATH) as src:
        data = src.read(1).astype("uint8")
        profile = src.profile.copy()
        nodata = src.nodata

    output = np.full(data.shape, np.nan, dtype="float32")

    for class_value, risk_score in RECLASSIFICATION.items():
        output[data == class_value] = risk_score

    if nodata is not None:
        output[data == nodata] = np.nan

    output = np.where(np.isfinite(output), output, -9999.0).astype("float32")

    profile.update(
        {
            "driver": "GTiff",
            "dtype": "float32",
            "count": 1,
            "nodata": -9999.0,
            "compress": "lzw",
        }
    )

    LANDCOVER_NORM_PATH.parent.mkdir(parents=True, exist_ok=True)

    with rasterio.open(LANDCOVER_NORM_PATH, "w", **profile) as dst:
        dst.write(output, 1)

    valid = output[output != -9999.0]

    print(f"landcover_norm.tif créé depuis ESA WorldCover : {LANDCOVER_NORM_PATH}")

    if valid.size > 0:
        print(f"Min norm : {valid.min():.4f}")
        print(f"Max norm : {valid.max():.4f}")
        print(f"Mean norm : {valid.mean():.4f}")
    else:
        print("Aucune donnée landcover valide.")


if __name__ == "__main__":
    main()
