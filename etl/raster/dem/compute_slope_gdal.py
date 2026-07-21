from pathlib import Path
import subprocess


PROJECT_ROOT = Path(__file__).resolve().parents[3]

DEM_METRIC_PATH = PROJECT_ROOT / "etl" / "data" / "raster" / "processed" / "dem" / "dem_madagascar_metric.tif"
SLOPE_PATH = PROJECT_ROOT / "etl" / "data" / "raster" / "processed" / "dem" / "slope_metric.tif"


def main():
    if not DEM_METRIC_PATH.exists():
        raise FileNotFoundError(
            f"DEM métrique introuvable : {DEM_METRIC_PATH}"
        )

    command = [
        "gdaldem",
        "slope",
        str(DEM_METRIC_PATH),
        str(SLOPE_PATH),
        "-of",
        "GTiff",
        "-compute_edges",
    ]

    print("Calcul de pente avec GDAL")
    print(f"Entrée : {DEM_METRIC_PATH}")
    print(f"Sortie : {SLOPE_PATH}")

    subprocess.run(command, check=True)

    print("Pente calculée.")


if __name__ == "__main__":
    main()
