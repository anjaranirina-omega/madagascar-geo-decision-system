from pathlib import Path

import numpy as np
import rasterio


PROJECT_ROOT = Path(__file__).resolve().parents[2]
RASTER_ROOT = PROJECT_ROOT / "etl" / "data" / "raster"


def summarize(path: Path):
    with rasterio.open(path) as src:
        data = src.read(1).astype("float32")
        nodata = src.nodata

        if nodata is not None:
            data = np.where(data == nodata, np.nan, data)

        print(f"\nFichier : {path.name}")
        print(f"  CRS        : {src.crs}")
        print(f"  Dimensions : {src.width} x {src.height}")
        print(f"  Résolution : {src.res}")
        print(f"  Bounds     : {src.bounds}")
        print(f"  Min        : {np.nanmin(data):.2f}")
        print(f"  Max        : {np.nanmax(data):.2f}")
        print(f"  Mean       : {np.nanmean(data):.2f}")


def main():
    rasters = sorted(RASTER_ROOT.rglob("*.tif"))

    if not rasters:
        print("Aucun raster trouvé.")
        return

    for raster in rasters:
        summarize(raster)


if __name__ == "__main__":
    main()
