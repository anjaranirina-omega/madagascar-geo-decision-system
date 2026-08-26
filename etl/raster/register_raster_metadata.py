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
        "name": "Classes de risque d’inondation",
        "type": "FLOOD_RISK_CLASSIFIED",
        "description": "Raster classifié du risque d’inondation : faible, moyen, élevé, critique.",
    },

    # Risque sécheresse
    "risk/drought/drought_hazard_index.tif": {
        "name": "Aléa sécheresse",
        "type": "DROUGHT_HAZARD_INDEX",
        "description": "Raster d’aléa sécheresse basé sur le déficit pluviométrique récent, le stress thermique et la sensibilité du territoire.",
    },
    "risk/drought/drought_risk_index.tif": {
        "name": "Risque sécheresse",
        "type": "DROUGHT_RISK_INDEX",
        "description": "Raster spécifique du risque sécheresse intégrant l’aléa, l’exposition humaine et la sensibilité de l’occupation du sol.",
    },
    "risk/drought/drought_risk_classified.tif": {
        "name": "Classes de risque sécheresse",
        "type": "DROUGHT_RISK_CLASSIFIED",
        "description": "Raster classifié du risque sécheresse : faible, moyen, élevé, critique.",
    },

    # Risque glissement de terrain
    "risk/landslide/landslide_hazard_index.tif": {
        "name": "Aléa glissement de terrain",
        "type": "LANDSLIDE_HAZARD_INDEX",
        "description": "Raster d’aléa glissement de terrain basé sur la pente, la pluie récente et la sensibilité de l’occupation du sol.",
    },
    "risk/landslide/landslide_risk_index.tif": {
        "name": "Risque glissement de terrain",
        "type": "LANDSLIDE_RISK_INDEX",
        "description": "Raster spécifique du risque glissement de terrain intégrant l’aléa, l’exposition humaine et l’occupation du sol.",
    },
    "risk/landslide/landslide_risk_classified.tif": {
        "name": "Classes de risque glissement de terrain",
        "type": "LANDSLIDE_RISK_CLASSIFIED",
        "description": "Raster classifié du risque glissement de terrain : faible, moyen, élevé, critique.",
    },

    # Risque cyclonique
    "risk/cyclone/cyclone_track_hazard_norm.tif": {
        "name": "Aléa historique cyclonique normalisé",
        "type": "CYCLONE_HAZARD_INDEX",
        "description": "Raster intermédiaire d’aléa cyclonique historique basé sur la proximité, densité et intensité des trajectoires IBTrACS.",
    },
    "risk/cyclone/cyclone_hazard_index.tif": {
        "name": "Aléa cyclonique",
        "type": "CYCLONE_HAZARD_INDEX",
        "description": "Raster d’aléa cyclonique basé sur IBTrACS et les précipitations récentes CHIRPS.",
    },
    "risk/cyclone/cyclone_risk_index.tif": {
        "name": "Risque cyclonique",
        "type": "CYCLONE_RISK_INDEX",
        "description": "Raster spécifique du risque cyclonique intégrant l’aléa historique, l’exposition humaine et la vulnérabilité de l’occupation du sol.",
    },
    "risk/cyclone/cyclone_risk_classified.tif": {
        "name": "Classes de risque cyclonique",
        "type": "CYCLONE_RISK_CLASSIFIED",
        "description": "Raster classifié du risque cyclonique : faible, moyen, élevé, critique.",
    },

    # Couches normalisées
    "normalized/rainfall_norm.tif": {
        "name": "Précipitations normalisées",
        "type": "RAINFALL",
        "description": "Couche raster des précipitations CHIRPS normalisées entre 0 et 1.",
    },
    "normalized/slope_norm.tif": {
        "name": "Pente normalisée",
        "type": "SLOPE",
        "description": "Couche raster de pente normalisée issue du DEM Copernicus GLO-30.",
    },
    "normalized/population_norm.tif": {
        "name": "Population normalisée",
        "type": "POPULATION",
        "description": "Couche raster WorldPop normalisée entre 0 et 1.",
    },
    "normalized/landcover_norm.tif": {
        "name": "Occupation du sol normalisée",
        "type": "LANDCOVER",
        "description": "Couche raster ESA WorldCover reclassifiée et normalisée entre 0 et 1.",
    },

    # Risque global
    "risk/risk_index.tif": {
        "name": "Indice de risque climatique",
        "type": "RISK_INDEX",
        "description": "Raster final d’indice de risque climatique global calculé par overlay pondéré.",
    },
    "risk/risk_classified.tif": {
        "name": "Classes de risque climatique",
        "type": "RISK_CLASSIFIED",
        "description": "Raster classifié du risque climatique global : 1 faible, 2 moyen, 3 élevé, 4 critique.",
    },
}


def summarize_raster(path: Path):
    with rasterio.open(path) as src:
        data = src.read(1).astype("float32")
        nodata = src.nodata

        if nodata is not None:
            data = np.where(data == nodata, np.nan, data)

        data = np.where(data <= -9999, np.nan, data)

        bounds = src.bounds
        valid = data[np.isfinite(data)]

        if valid.size == 0:
            min_value = None
            max_value = None
            mean_value = None
        else:
            min_value = float(valid.min())
            max_value = float(valid.max())
            mean_value = float(valid.mean())

        return {
            "crs": str(src.crs),
            "resolutionX": float(src.res[0]),
            "resolutionY": float(src.res[1]),
            "minValue": min_value,
            "maxValue": max_value,
            "meanValue": mean_value,
            "width": int(src.width),
            "height": int(src.height),
            "bounds": f"{bounds.left},{bounds.bottom},{bounds.right},{bounds.top}",
        }


def file_sha256(path: Path) -> str:
    digest = hashlib.sha256()

    with path.open("rb") as file:
        for chunk in iter(lambda: file.read(1024 * 1024), b""):
            digest.update(chunk)

    return digest.hexdigest()


def ensure_relative_to_project(path: Path) -> str:
    return str(path.resolve().relative_to(PROJECT_ROOT.resolve()))


def find_existing_version_by_hash(version_dir: Path, source_hash: str) -> Path | None:
    if not version_dir.exists():
        return None

    for candidate in sorted(version_dir.glob("*.tif"), reverse=True):
        try:
            if file_sha256(candidate) == source_hash:
                return candidate
        except OSError:
            continue

    return None


def create_versioned_copy(raster_path: Path, raster_type: str) -> Path:
    source_hash = file_sha256(raster_path)
    hash_short = source_hash[:10]

    version_dir = RASTER_VERSION_HISTORY_DIR / raster_type
    version_dir.mkdir(parents=True, exist_ok=True)

    if RASTER_VERSION_DEDUP_BY_HASH:
        existing = find_existing_version_by_hash(version_dir, source_hash)

        if existing:
            print(
                f"Version identique déjà présente pour {raster_type}, "
                f"réutilisation : {ensure_relative_to_project(existing)}"
            )
            return existing

    timestamp = datetime.now(timezone.utc).strftime("%Y%m%d_%H%M%S")
    destination = version_dir / f"{raster_type}_{timestamp}_{hash_short}.tif"

    suffix = 1
    while destination.exists():
        destination = version_dir / f"{raster_type}_{timestamp}_{hash_short}_{suffix}.tif"
        suffix += 1

    shutil.copy2(raster_path, destination)

    print(
        f"Snapshot raster créé pour {raster_type} : "
        f"{ensure_relative_to_project(destination)}"
    )

    return destination


def should_version_raster(raster_type: str) -> bool:
    return (
        RASTER_VERSION_HISTORY_ENABLED
        and raster_type in RASTER_VERSION_HISTORY_TYPES
    )


def build_registration_path(raster_path: Path, raster_type: str) -> Path:
    if should_version_raster(raster_type):
        return create_versioned_copy(raster_path, raster_type)

    return raster_path


def register_layer(relative_path: str, config: dict):
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
    response = requests.post(url, json=payload, timeout=30)

    if response.status_code >= 400:
        print("Erreur API:", response.status_code, response.text)
        response.raise_for_status()

    version_mode = "versionné" if registration_path != raster_path else "courant"

    print(f"Raster enregistré ({version_mode}) : {payload['name']}")
    print(response.json())


def main():
    print(f"API backend : {API_BASE_URL}")
    print(f"Historique raster activé : {RASTER_VERSION_HISTORY_ENABLED}")
    print(f"Types historisés : {', '.join(sorted(RASTER_VERSION_HISTORY_TYPES))}")
    print(f"Répertoire versions : {RASTER_VERSION_HISTORY_DIR}")
    print(f"Déduplication par hash : {RASTER_VERSION_DEDUP_BY_HASH}")

    for relative_path, config in RASTER_CONFIG.items():
        register_layer(relative_path, config)

    print("Enregistrement des métadonnées raster terminé.")


if __name__ == "__main__":
    main()
