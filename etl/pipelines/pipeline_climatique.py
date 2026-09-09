#!/usr/bin/env python3
"""
Pipeline Climatique - Extraction, Transformation et Chargement des données climatiques (NASA POWER).
Ce pipeline synchronise les observations météorologiques quotidiennes (température, précipitations,
humidité, vent) pour l'ensemble des régions de Madagascar et met à jour la table 'climate_observations'.
"""

import logging
import os
import sys
from pathlib import Path

# Initialisation des chemins
ETL_DIR = Path(__file__).resolve().parents[1]
if str(ETL_DIR) not in sys.path:
    sys.path.insert(0, str(ETL_DIR))

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] [PipelineClimatique] %(message)s",
)
logger = logging.getLogger("PipelineClimatique")


def run() -> bool:
    """
    Exécute le pipeline d'extraction et de synchronisation des données climatiques régionales NASA POWER.
    Retourne True en cas de succès, False ou lève une exception en cas d'erreur.
    """
    logger.info("=== Démarrage du pipeline climatique ===")
    try:
        from climate.nasa_power.fetch_nasa_power_regions import main as fetch_nasa_power_main

        fetch_nasa_power_main()
        logger.info("=== Pipeline climatique terminé avec succès ===")
        return True
    except Exception as exc:
        logger.error(f"Erreur durant l'exécution du pipeline climatique : {exc}", exc_info=True)
        raise


if __name__ == "__main__":
    try:
        run()
    except Exception:
        sys.exit(1)
