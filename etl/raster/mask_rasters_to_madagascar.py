import argparse
from pathlib import Path

import geopandas as gpd
import rasterio
from rasterio.mask import mask


PROJECT_ROOT = Path(__file__).resolve().parents[2]

GADM_PATH = PROJECT_ROOT / "etl" / "data" / "geographie" / "gadm41_MDG.gpkg"
GADM_COUNTRY_LAYER = "ADM_ADM_0"

RASTER_ROOT = PROJECT_ROOT / "etl" / "data" / "raster"

SCOPES = {
    "normalized": [
        RASTER_ROOT / "normalized" / "rainfall_norm.tif",
        RASTER_ROOT / "normalized" / "slope_norm.tif",
        RASTER_ROOT / "normalized" / "population_norm.tif",
        RASTER_ROOT / "normalized" / "landcover_norm.tif",
    ],
    "risk": [
        RASTER_ROOT / "risk" / "risk_index.tif",
        RASTER_ROOT / "risk" / "risk_classified.tif",
    ],
}


def load_madagascar_boundary(target_crs):
    if not GADM_PATH.exists():
        raise FileNotFoundError(
            f"Fichier GADM introuvable : {GADM_PATH}\n"
            "Télécharge GADM Madagascar :\n"
            "wget -O etl/data/geographie/gadm41_MDG.gpkg "
            "https://geodata.ucdavis.edu/gadm/gadm4.1/gpkg/gadm41_MDG.gpkg"
        )

    gdf = gpd.read_file(GADM_PATH, layer=GADM_COUNTRY_LAYER)

    if gdf.crs is None:
        gdf = gdf.set_crs(epsg=4326)

    gdf = gdf.to_crs(target_crs)

    # Corriger les géométries si nécessaire
    gdf["geometry"] = gdf.geometry.apply(
        lambda geom: geom.buffer(0) if geom is not None and not geom.is_valid else geom
    )

    return [geom for geom in gdf.geometry if geom is not None and not geom.is_empty]


def mask_raster_in_place(path: Path):
    if not path.exists():
        print(f"Raster absent, ignoré : {path}")
        return

    print(f"Masquage : {path.relative_to(PROJECT_ROOT)}")

    with rasterio.open(path) as src:
        geometries = load_madagascar_boundary(src.crs)

        nodata = src.nodata
        if nodata is None:
            nodata = -9999.0

        out_image, out_transform = mask(
            src,
            geometries,
            crop=False,
            nodata=nodata,
            filled=True,
        )

        profile = src.profile.copy()
        profile.update(
            {
                "height": out_image.shape[1],
                "width": out_image.shape[2],
                "transform": out_transform,
                "nodata": nodata,
                "compress": "lzw",
            }
        )

    tmp_path = path.with_suffix(".masked.tmp.tif")

    with rasterio.open(tmp_path, "w", **profile) as dst:
        dst.write(out_image)

    tmp_path.replace(path)

    print(f"  OK : {path.name}")


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument(
        "--scope",
        choices=["normalized", "risk", "all"],
        default="all",
        help="Choisir les rasters à masquer.",
    )

    args = parser.parse_args()

    if args.scope == "all":
        paths = SCOPES["normalized"] + SCOPES["risk"]
    else:
        paths = SCOPES[args.scope]

    for path in paths:
        mask_raster_in_place(path)

    print("Masquage terminé.")


if __name__ == "__main__":
    main()
