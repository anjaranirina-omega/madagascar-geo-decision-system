from pathlib import Path

import numpy as np
import rasterio
from rasterio.transform import from_bounds


PROJECT_ROOT = Path(__file__).resolve().parents[2]
OUTPUT_DIR = PROJECT_ROOT / "etl" / "data" / "raster" / "normalized"

# Emprise approximative de Madagascar en EPSG:4326
# west, south, east, north
MADAGASCAR_BOUNDS = (43.0, -26.0, 51.0, -11.0)

WIDTH = 420
HEIGHT = 720
CRS = "EPSG:4326"


def write_raster(path: Path, data: np.ndarray):
    path.parent.mkdir(parents=True, exist_ok=True)

    transform = from_bounds(*MADAGASCAR_BOUNDS, WIDTH, HEIGHT)

    profile = {
        "driver": "GTiff",
        "height": HEIGHT,
        "width": WIDTH,
        "count": 1,
        "dtype": "float32",
        "crs": CRS,
        "transform": transform,
        "nodata": -9999.0,
        "compress": "lzw",
    }

    with rasterio.open(path, "w", **profile) as dst:
        dst.write(data.astype("float32"), 1)


def normalize(array: np.ndarray) -> np.ndarray:
    min_value = np.nanmin(array)
    max_value = np.nanmax(array)

    if max_value == min_value:
        return np.zeros_like(array, dtype="float32")

    normalized = (array - min_value) / (max_value - min_value)
    return np.clip(normalized, 0, 1).astype("float32")


def main():
    np.random.seed(42)

    y = np.linspace(0, 1, HEIGHT).reshape(-1, 1)
    x = np.linspace(0, 1, WIDTH).reshape(1, -1)

    # Démonstration :
    # Est plus humide, sud plus sec, quelques zones bruitées
    rainfall = (
        0.55 * x
        + 0.25 * (1 - y)
        + 0.15 * np.sin(8 * x)
        + 0.05 * np.random.random((HEIGHT, WIDTH))
    )

    # Pente : plus forte dans les hautes terres centrales simulées
    center_x = 0.52
    center_y = 0.48
    distance_to_center = np.sqrt((x - center_x) ** 2 + (y - center_y) ** 2)
    slope = 1 - normalize(distance_to_center)
    slope += 0.08 * np.random.random((HEIGHT, WIDTH))

    # Population : forte autour d'Antananarivo simulé + quelques pôles
    tana_x, tana_y = 0.56, 0.47
    pop_core = np.exp(-(((x - tana_x) ** 2) / 0.01 + ((y - tana_y) ** 2) / 0.008))
    coast_pole = np.exp(-(((x - 0.78) ** 2) / 0.015 + ((y - 0.38) ** 2) / 0.018))
    population = pop_core + 0.45 * coast_pole + 0.04 * np.random.random((HEIGHT, WIDTH))

    # Occupation du sol / vulnérabilité : zones côtières + zones basses simulées
    landcover = (
        0.35 * x
        + 0.25 * y
        + 0.25 * np.exp(-((x - 0.25) ** 2) / 0.04)
        + 0.04 * np.random.random((HEIGHT, WIDTH))
    )

    rasters = {
        "rainfall_norm.tif": normalize(rainfall),
        "slope_norm.tif": normalize(slope),
        "population_norm.tif": normalize(population),
        "landcover_norm.tif": normalize(landcover),
    }

    for filename, data in rasters.items():
        output_path = OUTPUT_DIR / filename
        write_raster(output_path, data)
        print(f"Raster généré : {output_path}")

    print("Génération des rasters normalisés terminée.")


if __name__ == "__main__":
    main()
