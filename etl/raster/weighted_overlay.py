from pathlib import Path

import numpy as np
import rasterio


PROJECT_ROOT = Path(__file__).resolve().parents[2]
NORMALIZED_DIR = PROJECT_ROOT / "etl" / "data" / "raster" / "normalized"
RISK_DIR = PROJECT_ROOT / "etl" / "data" / "raster" / "risk"


WEIGHTS = {
    "rainfall_norm.tif": 0.35,
    "slope_norm.tif": 0.25,
    "population_norm.tif": 0.25,
    "landcover_norm.tif": 0.15,
}


def read_raster(path: Path):
    with rasterio.open(path) as src:
        data = src.read(1).astype("float32")
        profile = src.profile.copy()
        nodata = src.nodata

    if nodata is not None:
        data = np.where(data == nodata, np.nan, data)

    return data, profile


def write_raster(path: Path, data: np.ndarray, profile: dict, dtype="float32", nodata=-9999.0):
    path.parent.mkdir(parents=True, exist_ok=True)

    output_profile = profile.copy()
    output_profile.update(
        {
            "driver": "GTiff",
            "count": 1,
            "dtype": dtype,
            "nodata": nodata,
            "compress": "lzw",
        }
    )

    output_data = np.where(np.isnan(data), nodata, data)

    with rasterio.open(path, "w", **output_profile) as dst:
        dst.write(output_data.astype(dtype), 1)


def classify_risk(risk_0_100: np.ndarray) -> np.ndarray:
    """
    Classes :
    1 = Faible    0-30
    2 = Moyen     31-60
    3 = Élevé     61-80
    4 = Critique  81-100
    """
    classified = np.full(risk_0_100.shape, np.nan, dtype="float32")

    classified[(risk_0_100 >= 0) & (risk_0_100 <= 30)] = 1
    classified[(risk_0_100 > 30) & (risk_0_100 <= 60)] = 2
    classified[(risk_0_100 > 60) & (risk_0_100 <= 80)] = 3
    classified[(risk_0_100 > 80)] = 4

    return classified


def main():
    weighted_sum = None
    reference_profile = None
    total_weight = 0

    for filename, weight in WEIGHTS.items():
        path = NORMALIZED_DIR / filename

        if not path.exists():
            raise FileNotFoundError(f"Raster introuvable : {path}")

        data, profile = read_raster(path)

        if weighted_sum is None:
            weighted_sum = np.zeros_like(data, dtype="float32")
            reference_profile = profile
        else:
            if data.shape != weighted_sum.shape:
                raise ValueError(f"Dimensions incompatibles pour {filename}")

        weighted_sum += data * weight
        total_weight += weight

        print(f"Ajout couche : {filename} poids={weight}")

    if weighted_sum is None or reference_profile is None:
        raise RuntimeError("Aucune couche raster traitée.")

    if total_weight == 0:
        raise RuntimeError("Somme des poids égale à zéro.")

    risk_0_1 = weighted_sum / total_weight
    risk_0_100 = np.clip(risk_0_1 * 100, 0, 100).astype("float32")
    risk_classified = classify_risk(risk_0_100)

    risk_index_path = RISK_DIR / "risk_index.tif"
    risk_classified_path = RISK_DIR / "risk_classified.tif"

    write_raster(risk_index_path, risk_0_100, reference_profile, dtype="float32", nodata=-9999.0)
    write_raster(risk_classified_path, risk_classified, reference_profile, dtype="float32", nodata=-9999.0)

    print(f"Raster indice de risque généré : {risk_index_path}")
    print(f"Raster classes de risque généré : {risk_classified_path}")

    print("Statistiques risk_index :")
    print(f"  min  = {np.nanmin(risk_0_100):.2f}")
    print(f"  max  = {np.nanmax(risk_0_100):.2f}")
    print(f"  mean = {np.nanmean(risk_0_100):.2f}")


if __name__ == "__main__":
    main()
