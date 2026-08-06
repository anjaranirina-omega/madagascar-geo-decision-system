from pathlib import Path

import geopandas as gpd
import numpy as np
import rasterio
from rasterio.features import rasterize
from scipy.ndimage import distance_transform_edt


PROJECT_ROOT = Path(__file__).resolve().parents[3]

RIVERS_GPKG = PROJECT_ROOT / "etl" / "data" / "hydrology" / "processed" / "madagascar_rivers.gpkg"
RIVERS_LAYER = "rivers"

REFERENCE_RASTER = PROJECT_ROOT / "etl" / "data" / "raster" / "normalized" / "rainfall_norm.tif"

RIVER_BINARY_PATH = PROJECT_ROOT / "etl" / "data" / "raster" / "processed" / "hydrology" / "rivers_binary.tif"
RIVER_DISTANCE_PATH = PROJECT_ROOT / "etl" / "data" / "raster" / "processed" / "hydrology" / "river_distance.tif"
RIVER_PROXIMITY_NORM_PATH = PROJECT_ROOT / "etl" / "data" / "raster" / "normalized" / "river_proximity_norm.tif"


def write_raster(path: Path, data: np.ndarray, profile: dict, dtype="float32", nodata=-9999.0):
    path.parent.mkdir(parents=True, exist_ok=True)

    output_profile = profile.copy()
    output_profile.update(
        {
            "driver": "GTiff",
            "dtype": dtype,
            "count": 1,
            "nodata": nodata,
            "compress": "lzw",
        }
    )

    with rasterio.open(path, "w", **output_profile) as dst:
        dst.write(data.astype(dtype), 1)


def normalize_inverse_distance(distance: np.ndarray):
    valid = np.isfinite(distance)

    if not np.any(valid):
        return np.zeros_like(distance, dtype="float32")

    max_distance = np.nanmax(distance[valid])

    if max_distance == 0:
        return np.ones_like(distance, dtype="float32")

    proximity = 1 - (distance / max_distance)
    return np.clip(proximity, 0, 1).astype("float32")


def main():
    if not RIVERS_GPKG.exists():
        raise FileNotFoundError(
            f"Rivières Madagascar introuvables : {RIVERS_GPKG}. "
            "Lance extract_madagascar_rivers.py"
        )

    if not REFERENCE_RASTER.exists():
        raise FileNotFoundError(
            f"Raster de référence introuvable : {REFERENCE_RASTER}"
        )

    print("Lecture rivières Madagascar...")
    rivers = gpd.read_file(RIVERS_GPKG, layer=RIVERS_LAYER)

    with rasterio.open(REFERENCE_RASTER) as ref:
        profile = ref.profile.copy()
        transform = ref.transform
        out_shape = (ref.height, ref.width)
        crs = ref.crs
        pixel_size_x, pixel_size_y = ref.res

    rivers = rivers.to_crs(crs)

    print(f"Nombre de géométries rivières : {len(rivers)}")

    shapes = ((geom, 1) for geom in rivers.geometry if geom is not None and not geom.is_empty)

    river_binary = rasterize(
        shapes=shapes,
        out_shape=out_shape,
        transform=transform,
        fill=0,
        dtype="uint8",
    )

    # Distance en nombre de pixels vers le pixel rivière le plus proche
    distance_pixels = distance_transform_edt(river_binary == 0)

    # Approximation de distance en degrés convertie grossièrement en mètres.
    # Comme tous les rasters sont en EPSG:4326 ici, on utilise une approximation.
    pixel_size_m = abs(pixel_size_x) * 111_320
    distance_m = distance_pixels * pixel_size_m

    river_proximity_norm = normalize_inverse_distance(distance_m)

    write_raster(RIVER_BINARY_PATH, river_binary, profile, dtype="uint8", nodata=255)
    write_raster(RIVER_DISTANCE_PATH, distance_m.astype("float32"), profile, dtype="float32", nodata=-9999.0)
    write_raster(RIVER_PROXIMITY_NORM_PATH, river_proximity_norm, profile, dtype="float32", nodata=-9999.0)

    print(f"Raster rivières binaire : {RIVER_BINARY_PATH}")
    print(f"Raster distance rivières : {RIVER_DISTANCE_PATH}")
    print(f"Raster proximité rivières normalisé : {RIVER_PROXIMITY_NORM_PATH}")

    print("Statistiques proximité :")
    print(f"  min  = {np.nanmin(river_proximity_norm):.4f}")
    print(f"  max  = {np.nanmax(river_proximity_norm):.4f}")
    print(f"  mean = {np.nanmean(river_proximity_norm):.4f}")


if __name__ == "__main__":
    main()
