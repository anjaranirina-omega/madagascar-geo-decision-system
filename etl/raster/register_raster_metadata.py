import os
from pathlib import Path

import numpy as np
import rasterio
import requests
from dotenv import load_dotenv


PROJECT_ROOT = Path(__file__).resolve().parents[2]
RASTER_ROOT = PROJECT_ROOT / "etl" / "data" / "raster"

load_dotenv(PROJECT_ROOT / ".env")
load_dotenv(PROJECT_ROOT / "backend" / ".env")

API_BASE_URL = os.getenv("BACKEND_API_URL", "http://localhost:3001/api")


RASTER_CONFIG = {
    "risk/flood/flood_hazard_index.tif": {
        "name": "Aléa d’inondation",
        "type": "FLOOD_HAZARD_INDEX",
        "description": "Raster d’aléa d’inondation basé sur les précipitations et la pente inversée.",
    },
    "risk/flood/flood_risk_index.tif": {
        "name": "Risque d’inondation",
        "type": "FLOOD_RISK_INDEX",
        "description": "Raster spécifique du risque d’inondation.",
    },
    "risk/flood/flood_risk_classified.tif": {
        "name": "Classes de risque d’inondation",
        "type": "FLOOD_RISK_CLASSIFIED",
        "description": "Raster classifié du risque d’inondation : faible, moyen, élevé, critique.",
    },

    "normalized/rainfall_norm.tif": {
        "name": "Précipitations normalisées",
        "type": "RAINFALL",
        "description": "Couche raster de démonstration des précipitations normalisées entre 0 et 1.",
    },
    "normalized/slope_norm.tif": {
        "name": "Pente normalisée",
        "type": "SLOPE",
        "description": "Couche raster de démonstration de la pente normalisée entre 0 et 1.",
    },
    "normalized/population_norm.tif": {
        "name": "Population normalisée",
        "type": "POPULATION",
        "description": "Couche raster de démonstration de la population normalisée entre 0 et 1.",
    },
    "normalized/landcover_norm.tif": {
        "name": "Occupation du sol normalisée",
        "type": "LANDCOVER",
        "description": "Couche raster de démonstration de l'occupation du sol normalisée entre 0 et 1.",
    },
    "risk/risk_index.tif": {
        "name": "Indice de risque climatique",
        "type": "RISK_INDEX",
        "description": "Raster final d'indice de risque climatique calculé par overlay pondéré.",
    },
    "risk/risk_classified.tif": {
        "name": "Classes de risque climatique",
        "type": "RISK_CLASSIFIED",
        "description": "Raster classifié : 1 faible, 2 moyen, 3 élevé, 4 critique.",
    },
}


def summarize_raster(path: Path):
    with rasterio.open(path) as src:
        data = src.read(1).astype("float32")
        nodata = src.nodata

        if nodata is not None:
            data = np.where(data == nodata, np.nan, data)

        bounds = src.bounds

        return {
            "crs": str(src.crs),
            "resolutionX": float(src.res[0]),
            "resolutionY": float(src.res[1]),
            "minValue": float(np.nanmin(data)),
            "maxValue": float(np.nanmax(data)),
            "meanValue": float(np.nanmean(data)),
            "width": int(src.width),
            "height": int(src.height),
            "bounds": f"{bounds.left},{bounds.bottom},{bounds.right},{bounds.top}",
        }


def register_layer(relative_path: str, config: dict):
    raster_path = RASTER_ROOT / relative_path

    if not raster_path.exists():
        print(f"Raster absent, ignoré : {raster_path}")
        return

    metadata = summarize_raster(raster_path)

    payload = {
        "name": config["name"],
        "type": config["type"],
        "filePath": str(raster_path.relative_to(PROJECT_ROOT)),
        "description": config["description"],
        "isActive": True,
        **metadata,
    }

    url = f"{API_BASE_URL}/rasters/register"

    response = requests.post(url, json=payload, timeout=30)

    if response.status_code >= 400:
        print("Erreur API:", response.status_code, response.text)
        response.raise_for_status()

    print(f"Raster enregistré : {payload['name']}")
    print(response.json())


def main():
    print(f"API backend : {API_BASE_URL}")

    for relative_path, config in RASTER_CONFIG.items():
        register_layer(relative_path, config)

    print("Enregistrement des métadonnées raster terminé.")


if __name__ == "__main__":
    main()
