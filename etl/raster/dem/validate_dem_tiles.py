from pathlib import Path

import numpy as np
import rasterio


PROJECT_ROOT = Path(__file__).resolve().parents[3]
TILES_DIR = PROJECT_ROOT / "etl" / "data" / "raster" / "raw" / "dem" / "tiles"


def validate_tile(path: Path):
    if path.stat().st_size < 10_000:
        raise ValueError(f"Fichier trop petit ({path.stat().st_size} octets)")

    with rasterio.open(path) as src:
        if src.width <= 0 or src.height <= 0:
            raise ValueError("Dimensions invalides")

        if src.crs is None:
            raise ValueError("CRS absent")

        _ = src.bounds
        _ = src.transform

        # IMPORTANT :
        # lire réellement les données pour détecter les erreurs internes TIFF
        data = src.read(1, masked=True)

        if data.size == 0:
            raise ValueError("Raster vide")

        # Vérification minimale des valeurs
        compressed = data.compressed()

        # Certaines tuiles de mer peuvent avoir très peu de données,
        # mais si elles sont lisibles, on les accepte.
        if compressed.size > 0:
            if not np.isfinite(compressed.astype("float64")).any():
                raise ValueError("Aucune valeur numérique valide")


def main():
    valid = []
    invalid = []

    for path in sorted(TILES_DIR.glob("*.tif")):
        try:
            validate_tile(path)
            valid.append(path)
        except Exception as error:
            invalid.append((path, error))

    print(f"Tuiles valides   : {len(valid)}")
    print(f"Tuiles invalides : {len(invalid)}")

    for path, error in invalid:
        print(f"Suppression tuile invalide : {path.name}")
        print(f"  Erreur : {error}")
        path.unlink(missing_ok=True)

    print("Validation terminée.")


if __name__ == "__main__":
    main()
