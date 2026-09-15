import argparse
import hashlib
import os
import shutil
from datetime import datetime, timezone
from pathlib import Path

import numpy as np
import rasterio
import requests
from dotenv import load_dotenv


PROJECT_ROOT = Path(__file__).resolve().parents[2]
RASTER_ROOT = PROJECT_ROOT / "etl" / "data" / "raster"

load_dotenv(PROJECT_ROOT / ".env")
load_dotenv(PROJECT_ROOT / "backend" / ".env", override=True)

API_BASE_URL = os.getenv("BACKEND_API_URL", "http://localhost:3001/api")
API_KEY = os.getenv("ETL_API_KEY") or os.getenv("BACKEND_API_TOKEN") or os.getenv("JWT_TOKEN")

RASTER_VERSION_HISTORY_ENABLED = (
    os.getenv("RASTER_VERSION_HISTORY_ENABLED", "true").strip().lower()
    in {"1", "true", "yes", "on"}
)

RASTER_VERSION_HISTORY_DIR = Path(
    os.getenv(
        "RASTER_VERSION_HISTORY_DIR",
        str(RASTER_ROOT / "versions"),
    )
)

RASTER_VERSION_HISTORY_TYPES = {
    value.strip()
    for value in os.getenv(
        "RASTER_VERSION_HISTORY_TYPES",
        "RISK_INDEX,FLOOD_HAZARD_INDEX,FLOOD_RISK_INDEX,DROUGHT_HAZARD_INDEX,DROUGHT_RISK_INDEX,LANDSLIDE_HAZARD_INDEX,LANDSLIDE_RISK_INDEX,CYCLONE_HAZARD_INDEX,CYCLONE_RISK_INDEX",
    ).split(",")
    if value.strip()
}

RASTER_VERSION_DEDUP_BY_HASH = (
    os.getenv("RASTER_VERSION_DEDUP_BY_HASH", "true").strip().lower()
    in {"1", "true", "yes", "on"}
)


RASTER_CONFIG = {
    # Risque inondation
    "risk/flood/flood_hazard_index.tif": {
        "name": "Aléa d’inondation",
        "type": "FLOOD_HAZARD_INDEX",
        "description": "Raster d’aléa d’inondation basé sur les précipitations, la pente inversée et la proximité hydrographique.",
    },
    "risk/flood/flood_risk_index.tif": {
        "name": "Risque d’inondation",
        "type": "FLOOD_RISK_INDEX",
        "description": "Raster spécifique du risque d’inondation intégrant l’aléa, l’exposition humaine et l’occupation du sol.",
    },
    "risk/flood/flood_risk_classified.tif": {
        "name": "Classes du risque d’inondation",
        "type": "FLOOD_RISK_CLASSIFIED",
        "description": "Raster classifié du risque d’inondation (1: Faible, 2: Moyen, 3: Élevé, 4: Critique).",
    },

    # Risque sécheresse
    "risk/drought/drought_hazard_index.tif": {
        "name": "Aléa de sécheresse",
        "type": "DROUGHT_HAZARD_INDEX",
        "description": "Raster d’aléa de sécheresse combinant déficit pluviométrique, stress thermique et sensibilité d’occupation du sol.",
    },
    "risk/drought/drought_risk_index.tif": {
        "name": "Risque de sécheresse",
        "type": "DROUGHT_RISK_INDEX",
        "description": "Raster spécifique du risque de sécheresse intégrant l’aléa, la densité de population et la vulnérabilité du sol.",
    },
    "risk/drought/drought_risk_classified.tif": {
        "name": "Classes du risque de sécheresse",
        "type": "DROUGHT_RISK_CLASSIFIED",
        "description": "Raster classifié du risque de sécheresse (1: Faible, 2: Moyen, 3: Élevé, 4: Critique).",
    },

    # Risque glissement de terrain
    "risk/landslide/landslide_hazard_index.tif": {
        "name": "Aléa de glissement de terrain",
        "type": "LANDSLIDE_HAZARD_INDEX",
        "description": "Raster d’aléa de glissement combinant forte pente, précipitations déclenchantes et sensibilité du couvert végétal.",
    },
    "risk/landslide/landslide_risk_index.tif": {
        "name": "Risque de glissement de terrain",
        "type": "LANDSLIDE_RISK_INDEX",
        "description": "Raster spécifique du risque de glissement de terrain intégrant l’aléa, la population exposée et l’occupation du sol.",
    },
    "risk/landslide/landslide_risk_classified.tif": {
        "name": "Classes du risque de glissement de terrain",
        "type": "LANDSLIDE_RISK_CLASSIFIED",
        "description": "Raster classifié du risque de glissement (1: Faible, 2: Moyen, 3: Élevé, 4: Critique).",
    },

    # Risque cyclonique
    "risk/cyclone/cyclone_hazard_index.tif": {
        "name": "Aléa cyclonique",
        "type": "CYCLONE_HAZARD_INDEX",
        "description": "Raster d’aléa cyclonique combinant proximité aux trajectoires IBTrACS et pluie extrême.",
    },
    "risk/cyclone/cyclone_risk_index.tif": {
        "name": "Risque cyclonique",
        "type": "CYCLONE_RISK_INDEX",
        "description": "Raster spécifique du risque cyclonique combinant aléa historique, population exposée et vulnérabilité.",
    },
    "risk/cyclone/cyclone_risk_classified.tif": {
        "name": "Classes du risque cyclonique",
        "type": "CYCLONE_RISK_CLASSIFIED",
        "description": "Raster classifié du risque cyclonique (1: Faible, 2: Moyen, 3: Élevé, 4: Critique).",
    },

    # Risque global / multicritère existant
    "risk/risk_index.tif": {
        "name": "Indice de risque global",
        "type": "RISK_INDEX",
        "description": "Indice composite multicritère combinant pluie, pente, population et occupation du sol.",
    },
    "risk/risk_classified.tif": {
        "name": "Classes de risque global",
        "type": "RISK_CLASSIFIED",
        "description": "Raster classifié de 1 à 4 (1: Faible, 2: Moyen, 3: Élevé, 4: Critique).",
    },

    # Rasters normalisés (facultatif mais utile pour debug / exploration)
    "normalized/rainfall_norm.tif": {
        "name": "Précipitations normalisées",
        "type": "NORMALIZED_RAINFALL",
        "description": "Précipitations CHIRPS normalisées de 0 à 1.",
    },
    "normalized/slope_norm.tif": {
        "name": "Pente normalisée",
        "type": "NORMALIZED_SLOPE",
        "description": "Pente Copernicus DEM normalisée de 0 à 1.",
    },
    "normalized/population_norm.tif": {
        "name": "Population normalisée",
        "type": "NORMALIZED_POPULATION",
        "description": "Population WorldPop normalisée de 0 à 1.",
    },
    "normalized/landcover_norm.tif": {
        "name": "Occupation du sol normalisée",
        "type": "NORMALIZED_LANDCOVER",
        "description": "Occupation du sol ESA WorldCover normalisée selon la vulnérabilité.",
    },
    "normalized/river_proximity_norm.tif": {
        "name": "Proximité aux rivières normalisée",
        "type": "NORMALIZED_RIVER_PROXIMITY",
        "description": "Proximité aux cours d'eau HydroRIVERS/HydroSHEDS normalisée.",
    },
}


def summarize_raster(raster_path: Path) -> dict:
    with rasterio.open(raster_path) as src:
        data = src.read(1).astype("float32")
        nodata = src.nodata

        valid_mask = np.isfinite(data)
        if nodata is not None:
            valid_mask &= (data != nodata)

        valid_data = data[valid_mask]

        if valid_data.size == 0:
            min_val = None
            max_val = None
            mean_val = None
        else:
            min_val = float(np.nanmin(valid_data))
            max_val = float(np.nanmax(valid_data))
            mean_val = float(np.nanmean(valid_data))

        bounds = {
            "left": float(src.bounds.left),
            "bottom": float(src.bounds.bottom),
            "right": float(src.bounds.right),
            "top": float(src.bounds.top),
        }

        return {
            "minValue": min_val,
            "maxValue": max_val,
            "meanValue": mean_val,
            "width": int(src.width),
            "height": int(src.height),
            "crs": str(src.crs),
            "bounds": bounds,
        }


def ensure_relative_to_project(path: Path) -> str:
    try:
        return str(path.relative_to(PROJECT_ROOT))
    except ValueError:
        return str(path)


def should_archive_layer(raster_type: str) -> bool:
    if not RASTER_VERSION_HISTORY_ENABLED:
        return False
    return raster_type in RASTER_VERSION_HISTORY_TYPES


def file_sha256(file_path: Path) -> str:
    hasher = hashlib.sha256()
    with open(file_path, "rb") as fh:
        for chunk in iter(lambda: fh.read(1024 * 1024), b""):
            hasher.update(chunk)
    return hasher.hexdigest()


def find_existing_duplicate(target_dir: Path, source_hash: str) -> Path | None:
    if not target_dir.exists():
        return None

    for existing_file in target_dir.glob("*.tif"):
        if not existing_file.is_file():
            continue
        try:
            if file_sha256(existing_file) == source_hash:
                return existing_file
        except Exception:
            continue
    return None


def create_versioned_copy(raster_path: Path, raster_type: str) -> Path:
    source_hash = file_sha256(raster_path)
    type_dir = RASTER_VERSION_HISTORY_DIR / raster_type
    type_dir.mkdir(parents=True, exist_ok=True)

    if RASTER_VERSION_DEDUP_BY_HASH:
        duplicate = find_existing_duplicate(type_dir, source_hash)
        if duplicate:
            print(
                f"Version identique existante réutilisée pour {raster_type} : {duplicate.name}"
            )
            return duplicate

    timestamp = datetime.now(timezone.utc).strftime("%Y%m%d_%H%M%SZ")
    hash_prefix = source_hash[:8]
    destination_name = f"{raster_type.lower()}_{timestamp}_{hash_prefix}.tif"
    destination = type_dir / destination_name

    shutil.copy2(raster_path, destination)
    print(f"Nouvelle version archivée pour {raster_type} : {destination}")
    return destination


def build_registration_path(raster_path: Path, raster_type: str) -> Path:
    if should_archive_layer(raster_type):
        return create_versioned_copy(raster_path, raster_type)
    return raster_path


def register_layer(relative_path: str, config: dict, token: str | None = None):
    raster_path = RASTER_ROOT / relative_path

    if not raster_path.exists():
        print(f"Raster absent, ignoré : {raster_path}")
        return

    registration_path = build_registration_path(raster_path, config["type"])
    metadata = summarize_raster(registration_path)

    payload = {
        "name": config["name"],
        "type": config["type"],
        "filePath": ensure_relative_to_project(registration_path),
        "description": config["description"],
        "isActive": True,
        **metadata,
    }

    url = f"{API_BASE_URL}/rasters/register"
    headers = {}
    auth_token = token or API_KEY
    if auth_token:
        headers["X-API-KEY"] = auth_token
        headers["Authorization"] = f"Bearer {auth_token}"

    response = requests.post(url, json=payload, headers=headers, timeout=30)

    if response.status_code >= 400:
        print("Erreur API:", response.status_code, response.text)
        response.raise_for_status()

    version_mode = "versionné" if registration_path != raster_path else "courant"

    print(f"Raster enregistré ({version_mode}) : {payload['name']}")
    print(response.json())


def main():
    parser = argparse.ArgumentParser(description="Enregistre les métadonnées raster dans le backend.")
    parser.add_argument("--token", "--api-key", dest="token", type=str, default=None, help="Clé API ou jeton JWT pour l'authentification backend.")
    args = parser.parse_args()

    token_to_use = args.token or API_KEY

    print(f"API backend : {API_BASE_URL}")
    print(f"Historique raster activé : {RASTER_VERSION_HISTORY_ENABLED}")
    print(f"Types historisés : {', '.join(sorted(RASTER_VERSION_HISTORY_TYPES))}")
    print(f"Répertoire versions : {RASTER_VERSION_HISTORY_DIR}")
    print(f"Déduplication par hash : {RASTER_VERSION_DEDUP_BY_HASH}")

    for relative_path, config in RASTER_CONFIG.items():
        register_layer(relative_path, config, token=token_to_use)

    print("Enregistrement des métadonnées raster terminé.")


if __name__ == "__main__":
    main()
