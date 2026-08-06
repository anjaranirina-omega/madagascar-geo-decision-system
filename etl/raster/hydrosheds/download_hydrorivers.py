from pathlib import Path

import requests


PROJECT_ROOT = Path(__file__).resolve().parents[3]

RAW_DIR = PROJECT_ROOT / "etl" / "data" / "hydrology" / "raw"
ZIP_PATH = RAW_DIR / "HydroRIVERS_v10_af_shp.zip"

# HydroRIVERS Africa Shapefile
URL = "https://data.hydrosheds.org/file/HydroRIVERS/HydroRIVERS_v10_af_shp.zip"


def main():
    RAW_DIR.mkdir(parents=True, exist_ok=True)

    if ZIP_PATH.exists() and ZIP_PATH.stat().st_size > 1024:
        print(f"HydroRIVERS déjà téléchargé : {ZIP_PATH}")
        return

    print(f"Téléchargement HydroRIVERS Africa : {URL}")

    response = requests.get(URL, timeout=300)

    if response.status_code != 200:
        print(response.text[:1000])
        raise RuntimeError(f"Erreur téléchargement HydroRIVERS HTTP {response.status_code}")

    ZIP_PATH.write_bytes(response.content)

    print(f"OK : {ZIP_PATH}")
    print(f"Taille : {ZIP_PATH.stat().st_size / 1024 / 1024:.2f} MB")


if __name__ == "__main__":
    main()
