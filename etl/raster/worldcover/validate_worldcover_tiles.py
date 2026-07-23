from pathlib import Path

import rasterio


PROJECT_ROOT = Path(__file__).resolve().parents[3]
TILES_DIR = PROJECT_ROOT / "etl" / "data" / "raster" / "raw" / "worldcover" / "tiles"


def main():
    valid = []
    invalid = []

    for path in sorted(TILES_DIR.glob("*.tif")):
        try:
            if path.stat().st_size < 10_000:
                raise ValueError(f"Fichier trop petit : {path.stat().st_size} octets")

            with rasterio.open(path) as src:
                if src.width <= 0 or src.height <= 0:
                    raise ValueError("Dimensions invalides")

                if src.crs is None:
                    raise ValueError("CRS absent")

                _ = src.bounds
                _ = src.read(
                    1,
                    window=(
                        (0, min(256, src.height)),
                        (0, min(256, src.width)),
                    ),
                )

            valid.append(path)
        except Exception as error:
            invalid.append((path, error))

    print(f"Tuiles valides   : {len(valid)}")
    print(f"Tuiles invalides : {len(invalid)}")

    for path, error in invalid:
        print(f"Tuile invalide : {path.name}")
        print(f"  Erreur : {error}")


if __name__ == "__main__":
    main()
