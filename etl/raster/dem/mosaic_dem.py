from pathlib import Path

import rasterio
from rasterio.merge import merge
from rasterio.warp import calculate_default_transform, reproject, Resampling


PROJECT_ROOT = Path(__file__).resolve().parents[3]

RAW_DIR = PROJECT_ROOT / "etl" / "data" / "raster" / "raw" / "dem"
TILES_DIR = RAW_DIR / "tiles"
MOSAIC_PATH = RAW_DIR / "dem_madagascar.tif"

PROCESSED_DIR = PROJECT_ROOT / "etl" / "data" / "raster" / "processed" / "dem"
DEM_METRIC_PATH = PROCESSED_DIR / "dem_madagascar_metric.tif"

# CRS métrique simple pour calcul de pente.
# Pour production avancée, on peut utiliser un CRS local adapté.
METRIC_CRS = "EPSG:3857"


def mosaic_tiles():
    tile_paths = sorted(TILES_DIR.glob("*.tif"))

    if not tile_paths:
        raise FileNotFoundError(
            f"Aucune tuile DEM trouvée dans {TILES_DIR}. "
            "Lance d'abord download_dem_opentopography.py"
        )

    print(f"Nombre de tuiles DEM : {len(tile_paths)}")

    datasets = [rasterio.open(path) for path in tile_paths]

    try:
        mosaic, transform = merge(datasets)
        profile = datasets[0].profile.copy()

        profile.update(
            {
                "driver": "GTiff",
                "height": mosaic.shape[1],
                "width": mosaic.shape[2],
                "transform": transform,
                "compress": "lzw",
                "count": 1,
            }
        )

        MOSAIC_PATH.parent.mkdir(parents=True, exist_ok=True)

        with rasterio.open(MOSAIC_PATH, "w", **profile) as dst:
            dst.write(mosaic[0], 1)

        print(f"Mosaïque DEM créée : {MOSAIC_PATH}")
    finally:
        for dataset in datasets:
            dataset.close()


def reproject_to_metric():
    PROCESSED_DIR.mkdir(parents=True, exist_ok=True)

    with rasterio.open(MOSAIC_PATH) as src:
        transform, width, height = calculate_default_transform(
            src.crs,
            METRIC_CRS,
            src.width,
            src.height,
            *src.bounds,
        )

        profile = src.profile.copy()
        profile.update(
            {
                "crs": METRIC_CRS,
                "transform": transform,
                "width": width,
                "height": height,
                "compress": "lzw",
            }
        )

        with rasterio.open(DEM_METRIC_PATH, "w", **profile) as dst:
            reproject(
                source=rasterio.band(src, 1),
                destination=rasterio.band(dst, 1),
                src_transform=src.transform,
                src_crs=src.crs,
                dst_transform=transform,
                dst_crs=METRIC_CRS,
                resampling=Resampling.bilinear,
            )

    print(f"DEM reprojeté en CRS métrique : {DEM_METRIC_PATH}")


def main():
    mosaic_tiles()
    reproject_to_metric()


if __name__ == "__main__":
    main()
