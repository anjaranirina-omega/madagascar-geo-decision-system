import gzip
from datetime import date, timedelta
from pathlib import Path

import numpy as np
import rasterio
import requests
from rasterio.enums import Resampling
from rasterio.vrt import WarpedVRT


PROJECT_ROOT = Path(__file__).resolve().parents[3]

RAW_DIR = PROJECT_ROOT / "etl" / "data" / "raster" / "raw" / "chirps" / "daily"
PROCESSED_DIR = PROJECT_ROOT / "etl" / "data" / "raster" / "processed" / "chirps"
NORMALIZED_DIR = PROJECT_ROOT / "etl" / "data" / "raster" / "normalized"

RAINFALL_LATEST_PATH = PROCESSED_DIR / "rainfall_chirps_latest.tif"
RAINFALL_NORM_PATH = NORMALIZED_DIR / "rainfall_norm.tif"

REFERENCE_CANDIDATES = [
    NORMALIZED_DIR / "slope_norm.tif",
    NORMALIZED_DIR / "population_norm.tif",
    NORMALIZED_DIR / "landcover_norm.tif",
]

BASE_URL = "https://data.chc.ucsb.edu/products/CHIRPS-2.0/global_daily/tifs/p05"

LOOKBACK_DAYS = 45


def find_reference_raster():
    for path in REFERENCE_CANDIDATES:
        if path.exists():
            return path

    raise FileNotFoundError(
        "Aucun raster de référence trouvé. "
        "Il faut slope_norm.tif, population_norm.tif ou landcover_norm.tif."
    )


def build_chirps_url(target_date: date):
    year = target_date.year
    month = target_date.month
    day = target_date.day

    filename = f"chirps-v2.0.{year}.{month:02d}.{day:02d}.tif.gz"
    url = f"{BASE_URL}/{year}/{filename}"

    return url, filename


def try_download(url: str, output_gz: Path):
    print(f"Test CHIRPS : {url}")

    response = requests.get(url, timeout=120)

    if response.status_code == 404:
        return False

    if response.status_code != 200:
        print(f"Erreur HTTP {response.status_code}")
        print(response.text[:500])
        return False

    output_gz.parent.mkdir(parents=True, exist_ok=True)
    output_gz.write_bytes(response.content)

    print(f"  Téléchargé : {output_gz}")
    return True


def decompress_gz(gz_path: Path, tif_path: Path):
    if tif_path.exists() and tif_path.stat().st_size > 1024:
        print(f"Déjà décompressé : {tif_path}")
        return

    with gzip.open(gz_path, "rb") as src:
        tif_path.write_bytes(src.read())

    print(f"Décompressé : {tif_path}")


def find_latest_available_chirps():
    today = date.today()

    for offset in range(1, LOOKBACK_DAYS + 1):
        target_date = today - timedelta(days=offset)

        url, filename = build_chirps_url(target_date)

        gz_path = RAW_DIR / filename
        tif_path = RAW_DIR / filename.replace(".gz", "")

        if tif_path.exists() and tif_path.stat().st_size > 1024:
            print(f"CHIRPS déjà disponible localement : {tif_path}")
            return target_date, tif_path

        if gz_path.exists() and gz_path.stat().st_size > 1024:
            print(f"Archive CHIRPS déjà téléchargée : {gz_path}")
            decompress_gz(gz_path, tif_path)
            return target_date, tif_path

        downloaded = try_download(url, gz_path)

        if downloaded:
            decompress_gz(gz_path, tif_path)
            return target_date, tif_path

    raise RuntimeError(
        f"Aucune donnée CHIRPS daily disponible dans les {LOOKBACK_DAYS} derniers jours."
    )


def normalize(array: np.ndarray):
    valid = np.isfinite(array)

    if not np.any(valid):
        return np.zeros_like(array, dtype="float32")

    min_value = np.nanmin(array[valid])
    max_value = np.nanmax(array[valid])

    if max_value == min_value:
        return np.zeros_like(array, dtype="float32")

    normalized = (array - min_value) / (max_value - min_value)
    return np.clip(normalized, 0, 1).astype("float32")


def align_chirps_to_reference(chirps_path: Path, reference_path: Path):
    print(f"Alignement CHIRPS sur : {reference_path}")

    with rasterio.open(reference_path) as ref:
        output_profile = ref.profile.copy()
        output_profile.update(
            {
                "driver": "GTiff",
                "dtype": "float32",
                "count": 1,
                "nodata": -9999.0,
                "compress": "lzw",
            }
        )

        PROCESSED_DIR.mkdir(parents=True, exist_ok=True)
        NORMALIZED_DIR.mkdir(parents=True, exist_ok=True)

        with rasterio.open(chirps_path) as src:
            with WarpedVRT(
                src,
                crs=ref.crs,
                transform=ref.transform,
                width=ref.width,
                height=ref.height,
                resampling=Resampling.bilinear,
            ) as vrt:
                data = vrt.read(1).astype("float32")

                nodata = vrt.nodata
                if nodata is not None:
                    data = np.where(data == nodata, np.nan, data)

                data = np.where(data < 0, np.nan, data)

    raw_output = np.where(np.isfinite(data), data, -9999.0).astype("float32")

    with rasterio.open(RAINFALL_LATEST_PATH, "w", **output_profile) as dst:
        dst.write(raw_output, 1)

    rainfall_norm = normalize(data)
    norm_output = np.where(np.isfinite(rainfall_norm), rainfall_norm, -9999.0).astype("float32")

    with rasterio.open(RAINFALL_NORM_PATH, "w", **output_profile) as dst:
        dst.write(norm_output, 1)

    print(f"CHIRPS latest aligné : {RAINFALL_LATEST_PATH}")
    print(f"rainfall_norm.tif mis à jour : {RAINFALL_NORM_PATH}")

    print("Statistiques CHIRPS daily :")
    print(f"  min  = {np.nanmin(data):.2f}")
    print(f"  max  = {np.nanmax(data):.2f}")
    print(f"  mean = {np.nanmean(data):.2f}")


def main():
    reference_path = find_reference_raster()
    target_date, chirps_path = find_latest_available_chirps()

    print(f"Dernière donnée CHIRPS disponible : {target_date}")
    print(f"Fichier : {chirps_path}")

    align_chirps_to_reference(chirps_path, reference_path)

    metadata_path = PROCESSED_DIR / "chirps_latest_metadata.txt"
    metadata_path.write_text(
        f"source=CHIRPS daily\n"
        f"date={target_date}\n"
        f"file={chirps_path.name}\n",
        encoding="utf-8",
    )

    print(f"Métadonnées CHIRPS écrites : {metadata_path}")


if __name__ == "__main__":
    main()
