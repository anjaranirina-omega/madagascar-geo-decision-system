import os
from pathlib import Path

import requests
from dotenv import load_dotenv


PROJECT_ROOT = Path(__file__).resolve().parents[3]

load_dotenv(PROJECT_ROOT / ".env")
load_dotenv(PROJECT_ROOT / "backend" / ".env")

API_KEY = os.getenv("OPENTOPOGRAPHY_API_KEY")
DEM_TYPE = os.getenv("OPENTOPOGRAPHY_DEM_TYPE", "COP30")
TILE_SIZE_DEGREES = float(os.getenv("DEM_TILE_SIZE_DEGREES", "1.0"))

RAW_DIR = PROJECT_ROOT / "etl" / "data" / "raster" / "raw" / "dem"
TILES_DIR = RAW_DIR / "tiles"

# Emprise approximative de Madagascar en EPSG:4326
WEST = 43.0
SOUTH = -26.0
EAST = 51.0
NORTH = -11.0

API_URL = "https://portal.opentopography.org/API/globaldem"


def frange(start: float, stop: float, step: float):
    value = start
    while value < stop:
        yield value
        value += step


def safe_name(value: float):
    return f"{value:.2f}".replace("-", "m").replace(".", "p")


def download_tile(
    west: float,
    south: float,
    east: float,
    north: float,
    output_path: Path,
):
    skip_path = output_path.with_suffix(".skip")

    if output_path.exists() and output_path.stat().st_size > 1024:
        print(f"Tuile déjà présente : {output_path.name}")
        return

    if skip_path.exists():
        print(f"Tuile déjà ignorée (No Content) : {output_path.name}")
        return

    params = {
        "demtype": DEM_TYPE,
        "south": south,
        "north": north,
        "west": west,
        "east": east,
        "outputFormat": "GTiff",
        "API_Key": API_KEY,
    }

    print(f"Téléchargement {DEM_TYPE} : {output_path.name}")
    print(f"  bounds: west={west}, south={south}, east={east}, north={north}")

    response = requests.get(API_URL, params=params, timeout=240)

    # 204 = No Content.
    # Certaines tuiles dans le rectangle Madagascar sont en mer ou sans contenu DEM.
    # On ne bloque pas le pipeline : on crée un marqueur .skip.
    if response.status_code == 204:
        print("  Tuile sans contenu OpenTopography (HTTP 204), ignorée.")
        skip_path.write_text(
            f"No content for bounds west={west}, south={south}, east={east}, north={north}\n",
            encoding="utf-8",
        )
        return

    if response.status_code != 200:
        print("Erreur OpenTopography:")
        print(response.text[:1200])

        if "maximum rate limit" in response.text.lower():
            raise RuntimeError(
                "Limite OpenTopography atteinte. Relance le téléchargement après 24h. "
                "Les tuiles déjà téléchargées seront conservées."
            )

        raise RuntimeError(
            f"Erreur OpenTopography HTTP {response.status_code}. "
            "La clé API n'est pas affichée pour des raisons de sécurité."
        )

    content_type = response.headers.get("content-type", "").lower()

    if "xml" in content_type or response.content[:5].lower().startswith(b"<?xml"):
        text = response.text[:1200]

        if "maximum rate limit" in text.lower():
            raise RuntimeError(
                "Limite OpenTopography atteinte. Relance le téléchargement après 24h. "
                "Les tuiles déjà téléchargées seront conservées."
            )

        raise RuntimeError(
            "OpenTopography a retourné une réponse XML au lieu d'un GeoTIFF. "
            f"Réponse : {text}"
        )

    output_path.parent.mkdir(parents=True, exist_ok=True)
    output_path.write_bytes(response.content)

    size_mb = output_path.stat().st_size / 1024 / 1024
    print(f"  OK : {output_path} ({size_mb:.2f} MB)")


def main():
    if not API_KEY:
        raise RuntimeError(
            "OPENTOPOGRAPHY_API_KEY manquant. "
            "Ajoute OPENTOPOGRAPHY_API_KEY=... dans le fichier .env à la racine."
        )

    TILES_DIR.mkdir(parents=True, exist_ok=True)

    print("Source DEM :", DEM_TYPE)
    print("Taille des tuiles :", TILE_SIZE_DEGREES)
    print("Dossier :", TILES_DIR)

    for west in frange(WEST, EAST, TILE_SIZE_DEGREES):
        for south in frange(SOUTH, NORTH, TILE_SIZE_DEGREES):
            east = min(west + TILE_SIZE_DEGREES, EAST)
            north = min(south + TILE_SIZE_DEGREES, NORTH)

            tile_name = (
                f"{DEM_TYPE}_"
                f"W{safe_name(west)}_S{safe_name(south)}_"
                f"E{safe_name(east)}_N{safe_name(north)}.tif"
            )

            output_path = TILES_DIR / tile_name
            download_tile(west, south, east, north, output_path)

    print("Téléchargement DEM terminé.")


if __name__ == "__main__":
    main()
