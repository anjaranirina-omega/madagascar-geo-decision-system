import gzip
import os
from pathlib import Path

import requests
from dotenv import load_dotenv


PROJECT_ROOT = Path(__file__).resolve().parents[3]

load_dotenv(PROJECT_ROOT / ".env")
load_dotenv(PROJECT_ROOT / "backend" / ".env")

RAW_DIR = PROJECT_ROOT / "etl" / "data" / "raster" / "raw" / "chirps"

DEFAULT_MONTHS = "2023-12,2024-01,2024-02,2024-03,2024-04"
CHIRPS_MONTHS = os.getenv("CHIRPS_MONTHS", DEFAULT_MONTHS)

BASE_URL = "https://data.chc.ucsb.edu/products/CHIRPS-2.0/global_monthly/tifs"


def parse_months():
    months = []

    for item in CHIRPS_MONTHS.split(","):
        item = item.strip()

        if not item:
            continue

        year, month = item.split("-")
        months.append((int(year), int(month)))

    return months


def download_file(url: str, output_path: Path):
    if output_path.exists() and output_path.stat().st_size > 1024:
        print(f"Déjà téléchargé : {output_path.name}")
        return

    print(f"Téléchargement : {url}")

    response = requests.get(url, timeout=240)

    if response.status_code != 200:
        print(response.text[:1000])
        raise RuntimeError(f"Erreur téléchargement CHIRPS HTTP {response.status_code}")

    output_path.parent.mkdir(parents=True, exist_ok=True)
    output_path.write_bytes(response.content)

    print(f"  OK : {output_path} ({output_path.stat().st_size / 1024 / 1024:.2f} MB)")


def unzip_gz(gz_path: Path, tif_path: Path):
    if tif_path.exists() and tif_path.stat().st_size > 1024:
        print(f"Déjà décompressé : {tif_path.name}")
        return

    print(f"Décompression : {gz_path.name}")

    with gzip.open(gz_path, "rb") as src:
        tif_path.write_bytes(src.read())

    print(f"  OK : {tif_path} ({tif_path.stat().st_size / 1024 / 1024:.2f} MB)")


def main():
    RAW_DIR.mkdir(parents=True, exist_ok=True)

    months = parse_months()

    print("Mois CHIRPS sélectionnés :")
    for year, month in months:
        print(f"  - {year}-{month:02d}")

    for year, month in months:
        filename = f"chirps-v2.0.{year}.{month:02d}.tif"
        gz_filename = f"{filename}.gz"

        url = f"{BASE_URL}/{gz_filename}"

        gz_path = RAW_DIR / gz_filename
        tif_path = RAW_DIR / filename

        download_file(url, gz_path)
        unzip_gz(gz_path, tif_path)

    print("Téléchargement CHIRPS terminé.")


if __name__ == "__main__":
    main()
