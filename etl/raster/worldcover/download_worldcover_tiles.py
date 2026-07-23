from pathlib import Path

import requests


PROJECT_ROOT = Path(__file__).resolve().parents[3]

TILES_DIR = PROJECT_ROOT / "etl" / "data" / "raster" / "raw" / "worldcover" / "tiles"

BASE_URL = "https://esa-worldcover.s3.eu-central-1.amazonaws.com/v200/2021/map"

# Tuiles 3° x 3° couvrant l'emprise utile autour de Madagascar.
# Certaines combinaisons peuvent ne pas exister dans le bucket ESA
# lorsqu'elles correspondent majoritairement à l'océan.
LAT_CODES = ["S27", "S24", "S21", "S18", "S15", "S12"]
LON_CODES = ["E042", "E045", "E048"]


def download_file(url: str, output_path: Path):
    skip_path = output_path.with_suffix(".skip")

    if output_path.exists() and output_path.stat().st_size > 1024:
        print(f"Déjà téléchargé : {output_path.name}")
        return

    if skip_path.exists():
        print(f"Tuile déjà ignorée : {output_path.name}")
        return

    print(f"Téléchargement : {output_path.name}")
    print(f"  URL : {url}")

    response = requests.get(url, timeout=300)

    if response.status_code == 404:
        print("  Tuile absente du bucket ESA WorldCover, ignorée.")
        skip_path.write_text(
            f"NoSuchKey: {url}\n",
            encoding="utf-8",
        )
        return

    if response.status_code != 200:
        print(f"Erreur HTTP {response.status_code}")
        print(response.text[:500])
        raise RuntimeError(
            f"Impossible de télécharger la tuile WorldCover. HTTP {response.status_code}"
        )

    output_path.parent.mkdir(parents=True, exist_ok=True)
    output_path.write_bytes(response.content)

    size_mb = output_path.stat().st_size / 1024 / 1024
    print(f"  OK : {output_path} ({size_mb:.2f} MB)")


def main():
    TILES_DIR.mkdir(parents=True, exist_ok=True)

    print("Téléchargement des tuiles ESA WorldCover 2021 v200 pour Madagascar")
    print(f"Dossier de sortie : {TILES_DIR}")

    processed = 0

    for lat in LAT_CODES:
        for lon in LON_CODES:
            filename = f"ESA_WorldCover_10m_2021_v200_{lat}{lon}_Map.tif"
            url = f"{BASE_URL}/{filename}"
            output_path = TILES_DIR / filename

            download_file(url, output_path)
            processed += 1

    print(f"Téléchargement terminé. Tuiles traitées : {processed}")


if __name__ == "__main__":
    main()
