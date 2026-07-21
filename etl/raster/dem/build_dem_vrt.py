from pathlib import Path
import subprocess


PROJECT_ROOT = Path(__file__).resolve().parents[3]

TILES_DIR = PROJECT_ROOT / "etl" / "data" / "raster" / "raw" / "dem" / "tiles"
VRT_PATH = PROJECT_ROOT / "etl" / "data" / "raster" / "raw" / "dem" / "dem_madagascar.vrt"


def main():
    tiles = sorted(TILES_DIR.glob("*.tif"))

    if not tiles:
        raise FileNotFoundError(
            f"Aucune tuile DEM trouvée dans {TILES_DIR}"
        )

    VRT_PATH.parent.mkdir(parents=True, exist_ok=True)

    command = [
        "gdalbuildvrt",
        str(VRT_PATH),
        *[str(tile) for tile in tiles],
    ]

    print(f"Création VRT : {VRT_PATH}")
    print(f"Nombre de tuiles : {len(tiles)}")

    subprocess.run(command, check=True)

    print("VRT créé avec succès.")
    print(VRT_PATH)


if __name__ == "__main__":
    main()
