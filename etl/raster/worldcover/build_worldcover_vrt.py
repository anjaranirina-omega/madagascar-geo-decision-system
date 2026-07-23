from pathlib import Path
import subprocess


PROJECT_ROOT = Path(__file__).resolve().parents[3]

TILES_DIR = PROJECT_ROOT / "etl" / "data" / "raster" / "raw" / "worldcover" / "tiles"
VRT_PATH = PROJECT_ROOT / "etl" / "data" / "raster" / "raw" / "worldcover" / "worldcover_madagascar.vrt"


def main():
    tiles = sorted(TILES_DIR.glob("*.tif"))

    if not tiles:
        raise FileNotFoundError(
            f"Aucune tuile ESA WorldCover trouvée dans {TILES_DIR}.\n"
            "Télécharge les tuiles depuis https://viewer.esa-worldcover.org/worldcover/ "
            "et place les fichiers .tif dans ce dossier."
        )

    VRT_PATH.parent.mkdir(parents=True, exist_ok=True)

    command = [
        "gdalbuildvrt",
        str(VRT_PATH),
        *[str(tile) for tile in tiles],
    ]

    print(f"Création VRT WorldCover : {VRT_PATH}")
    print(f"Nombre de tuiles : {len(tiles)}")

    subprocess.run(command, check=True)

    print("VRT WorldCover créé avec succès.")


if __name__ == "__main__":
    main()
