from pathlib import Path
import zipfile


PROJECT_ROOT = Path(__file__).resolve().parents[3]

RAW_DIR = PROJECT_ROOT / "etl" / "data" / "hydrology" / "raw"
ZIP_PATH = RAW_DIR / "HydroRIVERS_v10_af_shp.zip"
EXTRACT_DIR = RAW_DIR / "HydroRIVERS_v10_af_shp"


def main():
    if not ZIP_PATH.exists():
        raise FileNotFoundError(
            f"Archive introuvable : {ZIP_PATH}. Lance d'abord download_hydrorivers.py"
        )

    EXTRACT_DIR.mkdir(parents=True, exist_ok=True)

    print(f"Extraction : {ZIP_PATH}")

    with zipfile.ZipFile(ZIP_PATH, "r") as zip_ref:
        zip_ref.extractall(EXTRACT_DIR)

    print(f"Extraction terminée : {EXTRACT_DIR}")

    shp_files = list(EXTRACT_DIR.rglob("*.shp"))

    if not shp_files:
        raise FileNotFoundError("Aucun shapefile trouvé après extraction.")

    print("Shapefiles trouvés :")
    for shp in shp_files:
        print(f"  - {shp}")


if __name__ == "__main__":
    main()
