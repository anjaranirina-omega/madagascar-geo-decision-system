from pathlib import Path

import numpy as np
import rasterio


PROJECT_ROOT = Path(__file__).resolve().parents[2]
RASTER_ROOT = PROJECT_ROOT / "etl" / "data" / "raster"


TARGET_PATTERNS = [
    "normalized/*.tif",
    "risk/*.tif",
    "processed/dem/dem_madagascar_metric.tif",
    "processed/dem/slope_metric.tif",
]


def compute_stats_by_blocks(path: Path):
    """
    Calcule min, max, moyenne sans charger tout le raster en mémoire.
    """
    min_value = None
    max_value = None
    total_sum = 0.0
    total_count = 0

    with rasterio.open(path) as src:
        nodata = src.nodata

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

            total_sum += float(valid.sum())
            total_count += int(valid.size)

        if total_count == 0:
            return {
                "min": None,
                "max": None,
                "mean": None,
            }

        return {
            "min": min_value,
            "max": max_value,
            "mean": total_sum / total_count,
        }


def summarize(path: Path):
    try:
        with rasterio.open(path) as src:
            stats = compute_stats_by_blocks(path)

            print(f"\nFichier : {path.relative_to(PROJECT_ROOT)}")
            print(f"  CRS        : {src.crs}")
            print(f"  Dimensions : {src.width} x {src.height}")
            print(f"  Résolution : {src.res}")
            print(f"  Bounds     : {src.bounds}")

            if stats["min"] is None:
                print("  Min        : aucune donnée valide")
                print("  Max        : aucune donnée valide")
                print("  Mean       : aucune donnée valide")
            else:
                print(f"  Min        : {stats['min']:.4f}")
                print(f"  Max        : {stats['max']:.4f}")
                print(f"  Mean       : {stats['mean']:.4f}")

    except Exception as error:
        print(f"\nFichier ignoré car illisible : {path}")
        print(f"  Erreur : {error}")


def find_target_rasters():
    rasters = []

    for pattern in TARGET_PATTERNS:
        rasters.extend(RASTER_ROOT.glob(pattern))

    return sorted(set(rasters))


def main():
    rasters = find_target_rasters()

    if not rasters:
        print("Aucun raster cible trouvé.")
        return

    print(f"Nombre de rasters cibles trouvés : {len(rasters)}")

    for raster in rasters:
        summarize(raster)


if __name__ == "__main__":
    main()
