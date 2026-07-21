from pathlib import Path
import subprocess


PROJECT_ROOT = Path(__file__).resolve().parents[3]

VRT_PATH = PROJECT_ROOT / "etl" / "data" / "raster" / "raw" / "dem" / "dem_madagascar.vrt"
OUTPUT_PATH = PROJECT_ROOT / "etl" / "data" / "raster" / "processed" / "dem" / "dem_madagascar_metric.tif"

# CRS métrique simple. Pour plus de précision, on pourra choisir un CRS local.
TARGET_CRS = "EPSG:3857"


def main():
    if not VRT_PATH.exists():
        raise FileNotFoundError(
            f"VRT introuvable : {VRT_PATH}. Lance d'abord build_dem_vrt.py"
        )

    OUTPUT_PATH.parent.mkdir(parents=True, exist_ok=True)

    command = [
        "gdalwarp",
        "-overwrite",
        "-t_srs",
        TARGET_CRS,
        "-r",
        "bilinear",
        "-multi",
        "-wo",
        "NUM_THREADS=ALL_CPUS",
        "-co",
        "COMPRESS=LZW",
        "-co",
        "TILED=YES",
        str(VRT_PATH),
        str(OUTPUT_PATH),
    ]

    print(f"Reprojection DEM vers {TARGET_CRS}")
    print(f"Sortie : {OUTPUT_PATH}")

    subprocess.run(command, check=True)

    print("Reprojection terminée.")


if __name__ == "__main__":
    main()
