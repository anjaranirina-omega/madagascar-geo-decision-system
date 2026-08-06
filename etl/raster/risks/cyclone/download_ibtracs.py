import os
from pathlib import Path

import requests
from dotenv import load_dotenv


PROJECT_ROOT = Path(__file__).resolve().parents[4]

load_dotenv(PROJECT_ROOT / ".env")
load_dotenv(PROJECT_ROOT / "backend" / ".env", override=True)

IBTRACS_SI_URL = os.getenv(
    "IBTRACS_SI_URL",
    "https://www.ncei.noaa.gov/data/international-best-track-archive-for-climate-stewardship-ibtracs/v04r01/access/csv/ibtracs.SI.list.v04r01.csv",
)

RAW_DIR = PROJECT_ROOT / "etl" / "data" / "cyclone" / "raw"
OUTPUT_PATH = RAW_DIR / "ibtracs.SI.list.v04r01.csv"


def main():
    RAW_DIR.mkdir(parents=True, exist_ok=True)

    if OUTPUT_PATH.exists() and OUTPUT_PATH.stat().st_size > 0:
        print(f"IBTrACS déjà présent : {OUTPUT_PATH}")
        print(f"Taille : {OUTPUT_PATH.stat().st_size / 1024 / 1024:.2f} MB")
        return

    tmp_path = OUTPUT_PATH.with_suffix(".csv.part")

    print(f"Téléchargement IBTrACS SI : {IBTRACS_SI_URL}")

    with requests.get(IBTRACS_SI_URL, stream=True, timeout=180) as response:
        if response.status_code >= 400:
            raise RuntimeError(
                f"Erreur téléchargement IBTrACS HTTP {response.status_code}: "
                f"{response.text[:500]}"
            )

        with open(tmp_path, "wb") as file:
            for chunk in response.iter_content(chunk_size=1024 * 1024):
                if chunk:
                    file.write(chunk)

    tmp_path.replace(OUTPUT_PATH)

    print(f"OK : {OUTPUT_PATH}")
    print(f"Taille : {OUTPUT_PATH.stat().st_size / 1024 / 1024:.2f} MB")


if __name__ == "__main__":
    main()
