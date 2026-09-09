"""
Module de chargement et d'actualisation du Data Warehouse Spatial (DWH / SOLAP).
Alimente le schéma en étoile : dimensions temporelles, spatiales, types de risques,
sources de données et tables de faits (indicateurs de risques, observations climatiques, rasters).
"""

import logging
import sys
from pathlib import Path

# Ajouter le répertoire ETL au sys.path si nécessaire
CURRENT_DIR = Path(__file__).resolve().parent
ETL_DIR = CURRENT_DIR.parent
if str(ETL_DIR) not in sys.path:
    sys.path.insert(0, str(ETL_DIR))

from dwh.build_risk_star_schema import main as build_star_schema

logger = logging.getLogger("load_to_dwh")


def load_to_dwh(df=None):
    """
    Déclenche la construction et l'actualisation complète du schéma en étoile du DWH.
    Optionnellement, accepte un DataFrame pour chargement spécifique ou délègue
    à la consolidation globale du star schema.
    """
    logger.info("Démarrage de l'alimentation du Data Warehouse spatial...")
    try:
        build_star_schema()
        logger.info("Alimentation du Data Warehouse spatial achevée avec succès.")
        return {"status": "success", "message": "DWH spatial actualisé avec succès."}
    except Exception as exc:
        logger.error(f"Erreur lors de l'alimentation du DWH : {exc}", exc_info=True)
        raise exc


if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
    load_to_dwh()
