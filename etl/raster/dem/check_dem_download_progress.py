import os
from pathlib import Path

from dotenv import load_dotenv


PROJECT_ROOT = Path(__file__).resolve().parents[3]

load_dotenv(PROJECT_ROOT / ".env")
load_dotenv(PROJECT_ROOT / "backend" / ".env")

DEM_TYPE = os.getenv("OPENTOPOGRAPHY_DEM_TYPE", "COP30")
TILE_SIZE_DEGREES = float(os.getenv("DEM_TILE_SIZE_DEGREES", "1.0"))

TILES_DIR = PROJECT_ROOT / "etl" / "data" / "raster" / "raw" / "dem" / "tiles"

WEST = 43.0
SOUTH = -26.0
EAST = 51.0
NORTH = -11.0


def frange(start: float, stop: float, step: float):
    value = start
    while value < stop:
        yield value
        value += step


def safe_name(value: float):
    return f"{value:.2f}".replace("-", "m").replace(".", "p")


def expected_tile_name(west: float, south: float, east: float, north: float):
    return (
        f"{DEM_TYPE}_"
        f"W{safe_name(west)}_S{safe_name(south)}_"
        f"E{safe_name(east)}_N{safe_name(north)}.tif"
    )


def main():
    expected = []

    for west in frange(WEST, EAST, TILE_SIZE_DEGREES):
        for south in frange(SOUTH, NORTH, TILE_SIZE_DEGREES):
            east = min(west + TILE_SIZE_DEGREES, EAST)
            north = min(south + TILE_SIZE_DEGREES, NORTH)
            expected.append(expected_tile_name(west, south, east, north))

    existing = {path.name for path in TILES_DIR.glob("*.tif")}
    skipped = {path.with_suffix(".tif").name for path in TILES_DIR.glob("*.skip")}
    completed = existing | skipped
    missing = [name for name in expected if name not in completed]

    print(f"Type DEM           : {DEM_TYPE}")
    print(f"Taille tuile       : {TILE_SIZE_DEGREES} degré(s)")
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
