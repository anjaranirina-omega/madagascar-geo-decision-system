import os
from copy import deepcopy

import requests


DEFAULT_MODEL_WEIGHTS = {
    "FLOOD": {
        "HAZARD": {
            "rainfall": 0.40,
            "inverse_slope": 0.25,
            "river_proximity": 0.35,
        },
        "RISK": {
            "hazard": 0.65,
            "population": 0.20,
            "landcover": 0.15,
        },
    },
    "DROUGHT": {
        "HAZARD": {
            "rainfall_deficit": 0.55,
            "temperature_stress": 0.30,
            "landcover_sensitivity": 0.15,
        },
        "RISK": {
            "hazard": 0.70,
            "population": 0.20,
            "landcover_sensitivity": 0.10,
        },
    },
    "LANDSLIDE": {
        "HAZARD": {
            "slope": 0.45,
            "rainfall": 0.35,
            "landcover_sensitivity": 0.20,
        },
        "RISK": {
            "hazard": 0.70,
            "population": 0.20,
            "landcover_sensitivity": 0.10,
        },
    },
    "CYCLONE": {
        "HAZARD": {
            "track_hazard": 0.75,
            "rainfall": 0.25,
        },
        "RISK": {
            "hazard": 0.70,
            "population": 0.20,
            "landcover_vulnerability": 0.10,
        },
    },
}


def deep_merge(defaults, override):
    result = deepcopy(defaults)

    for part, weights in (override or {}).items():
        if part not in result:
            result[part] = {}

        for criterion, value in (weights or {}).items():
            try:
                result[part][criterion] = float(value)
            except (TypeError, ValueError):
                pass

    return result


def load_model_weights(risk_type: str):
    risk_type = risk_type.upper()
    defaults = DEFAULT_MODEL_WEIGHTS[risk_type]

    base_url = os.getenv("BACKEND_API_URL", "http://localhost:3001/api")

    try:
        response = requests.get(
            f"{base_url}/risques/model-weights/{risk_type}/object",
            timeout=8,
        )

        if response.status_code >= 400:
            print(
                f"Poids {risk_type}: backend HTTP {response.status_code}, utilisation des défauts."
            )
            return deepcopy(defaults)

        remote = response.json()
        merged = deep_merge(defaults, remote)

        print(f"Poids {risk_type} récupérés depuis backend : {merged}")

        return merged
    except Exception as exc:
        print(f"Poids {risk_type}: backend indisponible ({exc}), défauts utilisés.")
        return deepcopy(defaults)
