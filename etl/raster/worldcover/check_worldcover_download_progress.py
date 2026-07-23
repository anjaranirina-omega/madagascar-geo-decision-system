from pathlib import Path


PROJECT_ROOT = Path(__file__).resolve().parents[3]

TILES_DIR = PROJECT_ROOT / "etl" / "data" / "raster" / "raw" / "worldcover" / "tiles"

LAT_CODES = ["S27", "S24", "S21", "S18", "S15", "S12"]
LON_CODES = ["E042", "E045", "E048"]


def main():
    expected = [
        f"ESA_WorldCover_10m_2021_v200_{lat}{lon}_Map.tif"
        for lat in LAT_CODES
        for lon in LON_CODES
    ]

    existing = {path.name for path in TILES_DIR.glob("*.tif")}
    skipped = {path.with_suffix(".tif").name for path in TILES_DIR.glob("*.skip")}

    completed = existing | skipped
    missing = [name for name in expected if name not in completed]

    print(f"Tuiles attendues   : {len(expected)}")
    print(f"Tuiles présentes   : {len(existing)}")
    print(f"Tuiles ignorées    : {len(skipped)}")
    print(f"Tuiles manquantes  : {len(missing)}")

    if missing:
        print("\nTuiles manquantes :")
        for name in missing:
            print(f"  - {name}")


if __name__ == "__main__":
    main()
