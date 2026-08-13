import os
import sys
from pathlib import Path

import geopandas as gpd
import numpy as np
import pandas as pd
import rasterio
from dotenv import load_dotenv
from rasterio.features import MergeAlg, rasterize
from scipy.ndimage import distance_transform_edt, gaussian_filter
from shapely.geometry import LineString
RISKS_DIR = Path(__file__).resolve().parents[1]
sys.path.append(str(RISKS_DIR))

from model_weights import load_model_weights


FILE_PATH = Path(__file__).resolve()
PROJECT_ROOT = FILE_PATH.parents[4]
ETL_ROOT = PROJECT_ROOT / "etl"

load_dotenv(PROJECT_ROOT / ".env")
load_dotenv(PROJECT_ROOT / "backend" / ".env", override=True)

NORMALIZED_DIR = ETL_ROOT / "data" / "raster" / "normalized"
OUTPUT_DIR = ETL_ROOT / "data" / "raster" / "risk" / "cyclone"

IBTRACS_CSV = (
    ETL_ROOT
    / "data"
    / "cyclone"
    / "raw"
    / "ibtracs.SI.list.v04r01.csv"
)

RAINFALL_RASTER = NORMALIZED_DIR / "rainfall_norm.tif"
POPULATION_RASTER = NORMALIZED_DIR / "population_norm.tif"
LANDCOVER_RASTER = NORMALIZED_DIR / "landcover_norm.tif"

CYCLONE_HAZARD_RASTER = OUTPUT_DIR / "cyclone_hazard_index.tif"
CYCLONE_RISK_RASTER = OUTPUT_DIR / "cyclone_risk_index.tif"
CYCLONE_CLASSIFIED_RASTER = OUTPUT_DIR / "cyclone_risk_classified.tif"
CYCLONE_TRACK_HAZARD_RASTER = OUTPUT_DIR / "cyclone_track_hazard_norm.tif"

NODATA = -9999.0

CYCLONE_START_YEAR = int(os.getenv("CYCLONE_START_YEAR", "1980"))
CYCLONE_DECAY_KM = float(os.getenv("CYCLONE_DECAY_KM", "180"))
CYCLONE_GAUSSIAN_KM = float(os.getenv("CYCLONE_GAUSSIAN_KM", "120"))

# BBox élargie autour de Madagascar / Sud-Ouest Océan Indien
MIN_LON = float(os.getenv("CYCLONE_MIN_LON", "35"))
MAX_LON = float(os.getenv("CYCLONE_MAX_LON", "65"))
MIN_LAT = float(os.getenv("CYCLONE_MIN_LAT", "-35"))
MAX_LAT = float(os.getenv("CYCLONE_MAX_LAT", "0"))


def clean_profile(profile):
    cleaned = profile.copy()

    for key in [
        "blockxsize",
        "blockysize",
        "tiled",
        "interleave",
        "compress",
        "predictor",
    ]:
        cleaned.pop(key, None)

    cleaned.update(
        {
            "driver": "GTiff",
            "dtype": "float32",
            "count": 1,
            "nodata": NODATA,
            "compress": "deflate",
        }
    )

    return cleaned


def read_normalized(path):
    if not path.exists():
        raise FileNotFoundError(f"Raster introuvable : {path}")

    with rasterio.open(path) as src:
        data = src.read(1).astype("float32")
        profile = src.profile
        transform = src.transform
        crs = src.crs

        nodata = src.nodata
        if nodata is not None:
            data = np.where(data == nodata, np.nan, data)

        data = np.where(data <= -9999, np.nan, data)
        data = np.where(data < 0, np.nan, data)

    return data, profile, transform, crs


def classify(values):
    classes = np.full(values.shape, NODATA, dtype="float32")
    valid = np.isfinite(values)

    classes[(values <= 30) & valid] = 1
    classes[(values > 30) & (values <= 60) & valid] = 2
    classes[(values > 60) & (values <= 80) & valid] = 3
    classes[(values > 80) & valid] = 4

    return classes


def normalize_array(values):
    valid = values[np.isfinite(values)]

    if valid.size == 0:
        return np.full(values.shape, np.nan, dtype="float32")

    vmin = float(valid.min())
    vmax = float(valid.max())

    if np.isclose(vmin, vmax):
        out = np.zeros(values.shape, dtype="float32")
        out[np.isfinite(values)] = 1.0 if vmax > 0 else 0.0
        out[~np.isfinite(values)] = np.nan
        return out

    return np.where(
        np.isfinite(values),
        (values - vmin) / (vmax - vmin),
        np.nan,
    ).astype("float32")


def wind_to_weight_knots(value):
    if value is None or not np.isfinite(value):
        return 0.35

    # 34 kt = tempête tropicale, 120 kt = cyclone très intense
    return float(np.clip((value - 34) / (120 - 34), 0.1, 1.0))


def read_ibtracs():
    if not IBTRACS_CSV.exists():
        raise FileNotFoundError(
            f"Fichier IBTrACS introuvable : {IBTRACS_CSV}\n"
            "Exécute d'abord : python raster/risks/cyclone/download_ibtracs.py"
        )

    print(f"Lecture IBTrACS : {IBTRACS_CSV}")

    df = pd.read_csv(
        IBTRACS_CSV,
        low_memory=False,
        na_values=["", " ", "NA", "NaN"],
    )

    # Certains CSV IBTrACS ont une ligne d'unités juste après l'en-tête.
    df = df[df["SID"].astype(str) != "SID"].copy()

    required_columns = ["SID", "SEASON", "ISO_TIME", "LAT", "LON"]
    for col in required_columns:
        if col not in df.columns:
            raise RuntimeError(f"Colonne IBTrACS manquante : {col}")

    df["SEASON"] = pd.to_numeric(df["SEASON"], errors="coerce")
    df["LAT"] = pd.to_numeric(df["LAT"], errors="coerce")
    df["LON"] = pd.to_numeric(df["LON"], errors="coerce")

    # Colonnes de vent possibles selon les agences.
    wind_columns = [
        col
        for col in [
            "WMO_WIND",
            "USA_WIND",
            "TOKYO_WIND",
            "CMA_WIND",
            "HKO_WIND",
            "NEWDELHI_WIND",
            "REUNION_WIND",
            "BOM_WIND",
            "NADI_WIND",
            "WELLINGTON_WIND",
        ]
        if col in df.columns
    ]

    if wind_columns:
        for col in wind_columns:
            df[col] = pd.to_numeric(df[col], errors="coerce")
        df["MAX_WIND_KT"] = df[wind_columns].max(axis=1, skipna=True)
    else:
        df["MAX_WIND_KT"] = np.nan

    df = df[
        (df["SEASON"] >= CYCLONE_START_YEAR)
        & (df["LAT"].between(MIN_LAT, MAX_LAT))
        & (df["LON"].between(MIN_LON, MAX_LON))
    ].copy()

    df = df.dropna(subset=["SID", "LAT", "LON"])

    if df.empty:
        raise RuntimeError("Aucun point IBTrACS trouvé dans la zone d’étude.")

    print(f"Points IBTrACS retenus : {len(df)}")
    print(f"Cyclones distincts : {df['SID'].nunique()}")
    print(f"Période : {int(df['SEASON'].min())} → {int(df['SEASON'].max())}")

    return df


def build_track_lines(df):
    lines = []

    for sid, group in df.groupby("SID"):
        group = group.sort_values("ISO_TIME")

        coords = list(zip(group["LON"], group["LAT"]))

        # Retirer éventuels doublons consécutifs
        clean_coords = []
        for lon, lat in coords:
            if not clean_coords or clean_coords[-1] != (lon, lat):
                clean_coords.append((lon, lat))

        if len(clean_coords) < 2:
            continue

        max_wind = pd.to_numeric(group["MAX_WIND_KT"], errors="coerce").max()
        weight = wind_to_weight_knots(max_wind)

        line = LineString(clean_coords)

        if line.is_empty:
            continue

        lines.append((line, weight))

    if not lines:
        raise RuntimeError("Aucune trajectoire cyclonique valide construite.")

    print(f"Trajectoires cycloniques construites : {len(lines)}")

    return lines


def build_track_hazard(df, profile, transform):
    height = profile["height"]
    width = profile["width"]

    lines = build_track_lines(df)

    weighted_tracks = rasterize(
        lines,
        out_shape=(height, width),
        transform=transform,
        fill=0,
        dtype="float32",
        all_touched=True,
        merge_alg=MergeAlg.add,
    )

    binary_tracks = rasterize(
        [(geom, 1) for geom, _ in lines],
        out_shape=(height, width),
        transform=transform,
        fill=0,
        dtype="uint8",
        all_touched=True,
    )

    # Distance approximative en km.
    pixel_width_deg = abs(transform.a)
    pixel_height_deg = abs(transform.e)
    mean_pixel_km = ((pixel_width_deg + pixel_height_deg) / 2) * 111.0

    dist_pixels = distance_transform_edt(binary_tracks == 0)
    dist_km = dist_pixels * mean_pixel_km

    proximity = np.exp(-dist_km / CYCLONE_DECAY_KM).astype("float32")

    sigma_pixels = max(CYCLONE_GAUSSIAN_KM / max(mean_pixel_km, 0.001), 1)
    density = gaussian_filter(weighted_tracks, sigma=sigma_pixels).astype("float32")
    density_norm = normalize_array(density)

    track_hazard = np.clip(
        0.60 * proximity + 0.40 * density_norm,
        0,
        1,
    ).astype("float32")

    return track_hazard


def reclass_landcover_for_cyclone(landcover_norm):
    """
    Vulnérabilité V1 au cyclone à partir de landcover_norm.
    - bâti : vulnérabilité élevée
    - cultures : vulnérabilité élevée
    - herbacées / arbustives : moyenne
    - forêt : exposition physique mais effet amortisseur partiel
    - eau : faible exposition humaine directe
    - zones humides / mangroves : vulnérabilité environnementale modérée
    """
    vulnerability = np.full(landcover_norm.shape, np.nan, dtype="float32")
    valid = np.isfinite(landcover_norm)

    vulnerability[np.isclose(landcover_norm, 0.30, atol=0.03) & valid] = 0.45
    vulnerability[np.isclose(landcover_norm, 0.35, atol=0.03) & valid] = 0.55
    vulnerability[np.isclose(landcover_norm, 0.40, atol=0.03) & valid] = 0.60
    vulnerability[np.isclose(landcover_norm, 0.65, atol=0.03) & valid] = 0.80
    vulnerability[np.isclose(landcover_norm, 0.90, atol=0.03) & valid] = 0.90
    vulnerability[np.isclose(landcover_norm, 0.55, atol=0.03) & valid] = 0.65
    vulnerability[np.isclose(landcover_norm, 0.80, atol=0.03) & valid] = 0.20
    vulnerability[np.isclose(landcover_norm, 0.85, atol=0.03) & valid] = 0.45
    vulnerability[np.isclose(landcover_norm, 0.70, atol=0.03) & valid] = 0.50

    vulnerability[np.isnan(vulnerability) & valid] = 0.50

    return vulnerability


def write_raster(path, array, profile):
    path.parent.mkdir(parents=True, exist_ok=True)

    output = np.where(np.isfinite(array), array, NODATA).astype("float32")

    with rasterio.open(path, "w", **clean_profile(profile)) as dst:
        dst.write(output, 1)


def main():
    rainfall_norm, profile, transform, _ = read_normalized(RAINFALL_RASTER)
    population_norm, _, _, _ = read_normalized(POPULATION_RASTER)
    landcover_norm, _, _, _ = read_normalized(LANDCOVER_RASTER)

    ibtracs = read_ibtracs()

    cyclone_track_hazard = build_track_hazard(ibtracs, profile, transform)

    landcover_vulnerability = reclass_landcover_for_cyclone(landcover_norm)
    weights = load_model_weights("CYCLONE")
    hazard_weights = weights["HAZARD"]
    risk_weights = weights["RISK"]

    valid_mask = (
        np.isfinite(cyclone_track_hazard)
        & np.isfinite(rainfall_norm)
        & np.isfinite(population_norm)
        & np.isfinite(landcover_vulnerability)
    )

    cyclone_hazard = np.full(rainfall_norm.shape, np.nan, dtype="float32")
    cyclone_risk = np.full(rainfall_norm.shape, np.nan, dtype="float32")

    cyclone_hazard[valid_mask] = (
        hazard_weights["track_hazard"] * cyclone_track_hazard[valid_mask]
        + hazard_weights["rainfall"] * rainfall_norm[valid_mask]
    )

    cyclone_risk[valid_mask] = (
        risk_weights["hazard"] * cyclone_hazard[valid_mask]
        + risk_weights["population"] * population_norm[valid_mask]
        + risk_weights["landcover_vulnerability"] * landcover_vulnerability[valid_mask]
    )

    cyclone_hazard_index = np.clip(cyclone_hazard * 100, 0, 100)
    cyclone_risk_index = np.clip(cyclone_risk * 100, 0, 100)
    cyclone_classified = classify(cyclone_risk_index)

    write_raster(CYCLONE_TRACK_HAZARD_RASTER, cyclone_track_hazard, profile)
    write_raster(CYCLONE_HAZARD_RASTER, cyclone_hazard_index, profile)
    write_raster(CYCLONE_RISK_RASTER, cyclone_risk_index, profile)
    write_raster(CYCLONE_CLASSIFIED_RASTER, cyclone_classified, profile)

    valid = cyclone_risk_index[np.isfinite(cyclone_risk_index)]

    print(f"Aléa trajectoires cyclone généré : {CYCLONE_TRACK_HAZARD_RASTER}")
    print(f"Aléa cyclone généré : {CYCLONE_HAZARD_RASTER}")
    print(f"Risque cyclone généré : {CYCLONE_RISK_RASTER}")
    print(f"Classes risque cyclone générées : {CYCLONE_CLASSIFIED_RASTER}")

    if valid.size:
        print("Statistiques cyclone_risk_index :")
        print(f"  min  = {float(valid.min()):.2f}")
        print(f"  max  = {float(valid.max()):.2f}")
        print(f"  mean = {float(valid.mean()):.2f}")

    print("Modèle cyclone IBTrACS V1 terminé.")
    print(
        "Note méthodologique : risque cyclonique historique basé sur IBTrACS SI "
        "depuis l'année configurée, combiné à CHIRPS, WorldPop et WorldCover."
    )


if __name__ == "__main__":
    main()
