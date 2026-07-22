import os
from pathlib import Path

import requests
from dotenv import load_dotenv


PROJECT_ROOT = Path(__file__).resolve().parents[3]

load_dotenv(PROJECT_ROOT / ".env")
load_dotenv(PROJECT_ROOT / "backend" / ".env")

RAW_DIR = PROJECT_ROOT / "etl" / "data" / "raster" / "raw" / "worldpop"

YEAR = os.getenv("WORLDPOP_YEAR", "2020")
COUNTRY = os.getenv("WORLDPOP_COUNTRY", "MDG")

# WorldPop unconstrained population count, 100m resolution
# URL pattern courant WorldPop.
# Si l'URL change, on pourra l'adapter.
BASE_URL = "https://data.worldpop.org/GIS/Population/Global_2000_2020/2020"

FILENAME = f"{COUNTRY.lower()}_ppp_{YEAR}_UNadj.tif"
URL = f"{BASE_URL}/{COUNTRY}/{FILENAME}"


def main():
    RAW_DIR.mkdir(parents=True, exist_ok=True)

    output_path = RAW_DIR / FILENAME

    if output_path.exists() and output_path.stat().st_size > 1024:
        print(f"WorldPop déjà téléchargé : {output_path}")
        return

    print(f"Téléchargement WorldPop : {URL}")

    response = requests.get(URL, timeout=300)

    if response.status_code != 200:
        print(response.text[:1000])
        raise RuntimeError(f"Erreur téléchargement WorldPop HTTP {response.status_code}")

    output_path.write_bytes(response.content)

    print(f"OK : {output_path}")
    print(f"Taille : {output_path.stat().st_size / 1024 / 1024:.2f} MB")


if __name__ == "__main__":
    main()
