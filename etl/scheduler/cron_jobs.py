#!/usr/bin/env python3
"""
========================================================================================
PLANIFICATEUR ETL (SCHEDULER) - MADAGASCAR GEO-DECISION SYSTEM
========================================================================================

Ce script constitue le point d'entrée principal du conteneur Docker 'geodecisionnel-etl'.
Il orchestre périodiquement les tâches d'extraction, de modélisation et de synchronisation
pour garantir l'actualisation continue des données géodécisionnelles :

TÂCHES ORCHESTRÉES :
----------------------------------------------------------------------------------------
1. Synchronisation des Cyclones Actifs (GDACS) :
   - Script     : etl/raster/risks/cyclone/fetch_active_cyclones.py
   - Rôle       : Interroge l'API GDACS (ONU/UE), détecte les cyclones dans le SWIO/Madagascar,
                  pousse la position et la trajectoire vers le backend (POST /api/meteo/active-cyclones/sync),
                  et déclenche automatiquement les alertes cycloniques temps réel.
   - Fréquence  : Toutes les 2 heures par défaut (CYCLONE_SYNC_INTERVAL_HOURS=2).

2. Pipeline Climatique (NASA POWER) :
   - Script     : etl/pipelines/pipeline_climatique.py -> climate/nasa_power/fetch_nasa_power_regions.py
   - Rôle       : Récupère les données climatiques quotidiennes régionales (T2M, RH2M, WS2M, PRECTOTCORR)
                  et met à jour la table 'climate_observations'.
   - Fréquence  : Toutes les 12 heures par défaut (CLIMATE_SYNC_INTERVAL_HOURS=12).

3. Déclenchement du Pipeline de Risque Complet (Backend API) :
   - Endpoint   : POST /api/etl/risk-pipeline/start
   - Rôle       : Déclenche de manière asynchrone les 20 étapes du pipeline de calcul de risque,
                  recalcul des rasters (inondation, sécheresse, glissement, cyclone), masquage,
                  statistiques zonales et mise à jour des statuts de sources.
   - Fréquence  : Toutes les 24 heures par défaut (RISK_PIPELINE_INTERVAL_HOURS=24).

4. Rafraîchissement du Schéma en Étoile DWH (Spatial OLAP) :
   - Script     : etl/dwh/build_risk_star_schema.py
   - Rôle       : Alimente les dimensions et tables de faits 'dwh.fact_risk_indicator' et
                  'dwh.fact_climate_observation' pour alimenter les analyses décisionnelles SOLAP.
   - Fréquence  : Toutes les 24 heures par défaut (DWH_REFRESH_INTERVAL_HOURS=24).

CONFIGURATION (VARIABLES D'ENVIRONNEMENT) :
----------------------------------------------------------------------------------------
- CYCLONE_SYNC_INTERVAL_HOURS    : Intervalle de sync cyclones (Défaut : 2)
- CLIMATE_SYNC_INTERVAL_HOURS    : Intervalle de sync climat (Défaut : 12)
- RISK_PIPELINE_INTERVAL_HOURS   : Intervalle de déclenchement pipeline de risque (Défaut : 24)
- DWH_REFRESH_INTERVAL_HOURS     : Intervalle de rafraîchissement DWH (Défaut : 24)
- ENABLE_CYCLONE_SYNC            : Activer la sync cyclones (Défaut : true)
- ENABLE_CLIMATE_SYNC            : Activer la sync climat (Défaut : true)
- ENABLE_RISK_PIPELINE_CRON      : Activer le pipeline de risque programmé (Défaut : true)
- ENABLE_DWH_REFRESH             : Activer le rafraîchissement DWH (Défaut : true)
- RUN_ON_STARTUP                 : Exécuter immédiatement un cycle au démarrage (Défaut : true)
- BACKEND_API_URL                : URL de base de l'API backend (Défaut : http://backend:3001/api ou http://localhost:3001/api)
- BACKEND_API_TOKEN / JWT_TOKEN  : Jeton JWT pour les requêtes backend authentifiées
========================================================================================
"""

import logging
import os
import signal
import subprocess
import sys
import time
from datetime import datetime
from pathlib import Path
from typing import Callable, Optional

import requests
import schedule
from dotenv import load_dotenv

# Initialisation des chemins
SCHEDULER_DIR = Path(__file__).resolve().parent
ETL_DIR = SCHEDULER_DIR.parent
PROJECT_ROOT = ETL_DIR.parent

load_dotenv(PROJECT_ROOT / ".env")
load_dotenv(PROJECT_ROOT / "backend" / ".env", override=True)

# Configuration du logging structuré
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] [Scheduler] %(message)s",
    handlers=[
        logging.StreamHandler(sys.stdout),
    ],
)
logger = logging.getLogger("EtlScheduler")

# Lecture des paramètres de configuration
CYCLONE_SYNC_INTERVAL_HOURS = int(os.getenv("CYCLONE_SYNC_INTERVAL_HOURS", "2"))
CLIMATE_SYNC_INTERVAL_HOURS = int(os.getenv("CLIMATE_SYNC_INTERVAL_HOURS", "12"))
RISK_PIPELINE_INTERVAL_HOURS = int(os.getenv("RISK_PIPELINE_INTERVAL_HOURS", "24"))
DWH_REFRESH_INTERVAL_HOURS = int(os.getenv("DWH_REFRESH_INTERVAL_HOURS", "24"))

ENABLE_CYCLONE_SYNC = os.getenv("ENABLE_CYCLONE_SYNC", "true").lower() in ("true", "1", "yes")
ENABLE_CLIMATE_SYNC = os.getenv("ENABLE_CLIMATE_SYNC", "true").lower() in ("true", "1", "yes")
ENABLE_RISK_PIPELINE_CRON = os.getenv("ENABLE_RISK_PIPELINE_CRON", "true").lower() in ("true", "1", "yes")
ENABLE_DWH_REFRESH = os.getenv("ENABLE_DWH_REFRESH", "true").lower() in ("true", "1", "yes")
RUN_ON_STARTUP = os.getenv("RUN_ON_STARTUP", "true").lower() in ("true", "1", "yes")

BACKEND_API_URL = os.getenv("BACKEND_API_URL", "http://localhost:3001/api")
API_TOKEN = os.getenv("BACKEND_API_TOKEN") or os.getenv("JWT_TOKEN")
PYTHON_BIN = sys.executable or "python3"

# Contrôle de cycle pour arrêt propre (Graceful Shutdown)
is_running = True


def handle_shutdown_signal(signum, frame):
    global is_running
    sig_name = signal.Signals(signum).name
    logger.info(f"Signal d'arrêt reçu ({sig_name}). Arrêt propre du scheduler en cours...")
    is_running = False


signal.signal(signal.SIGINT, handle_shutdown_signal)
signal.signal(signal.SIGTERM, handle_shutdown_signal)


def safe_run_job(job_name: str, job_func: Callable[[], None]) -> bool:
    """
    Encapsule l'exécution d'une tâche avec mesure du temps, logging structuré et
    capture totale des exceptions pour garantir l'isolation et la continuité du scheduler.
    """
    logger.info(f"==> [START] Tâche : {job_name}")
    start_time = time.time()
    try:
        job_func()
        duration = round(time.time() - start_time, 2)
        logger.info(f"<== [SUCCESS] Tâche : {job_name} terminée en {duration}s")
        return True
    except Exception as exc:
        duration = round(time.time() - start_time, 2)
        logger.error(
            f"<== [FAILED] Tâche : {job_name} a échoué après {duration}s avec l'erreur : {exc}",
            exc_info=True,
        )
        return False


# --------------------------------------------------------------------------------------
# DÉFINITION DES TÂCHES PLANIFIÉES
# --------------------------------------------------------------------------------------

def run_cyclone_sync():
    """Exécute le script de détection et synchronisation des cyclones actifs GDACS."""
    script_path = ETL_DIR / "raster" / "risks" / "cyclone" / "fetch_active_cyclones.py"
    if not script_path.exists():
        raise FileNotFoundError(f"Script introuvable : {script_path}")

    env = os.environ.copy()
    env["PYTHONPATH"] = str(ETL_DIR)
    
    result = subprocess.run(
        [PYTHON_BIN, str(script_path)],
        cwd=str(ETL_DIR),
        env=env,
        capture_output=True,
        text=True,
        timeout=180,
    )

    if result.returncode != 0:
        logger.error(f"[CycloneSync STDERR] :\n{result.stderr.strip()}")
        raise RuntimeError(f"fetch_active_cyclones.py a retourné le code de sortie {result.returncode}")
    else:
        logger.info(f"[CycloneSync Output] : {result.stdout.strip().splitlines()[-1] if result.stdout.strip() else 'Succès'}")


def run_climate_pipeline():
    """Exécute le pipeline d'ingestion des données climatiques (NASA POWER)."""
    script_path = ETL_DIR / "pipelines" / "pipeline_climatique.py"
    if not script_path.exists():
        raise FileNotFoundError(f"Script introuvable : {script_path}")

    env = os.environ.copy()
    env["PYTHONPATH"] = str(ETL_DIR)

    result = subprocess.run(
        [PYTHON_BIN, str(script_path)],
        cwd=str(ETL_DIR),
        env=env,
        capture_output=True,
        text=True,
        timeout=600,
    )

    if result.returncode != 0:
        logger.error(f"[ClimatePipeline STDERR] :\n{result.stderr.strip()}")
        raise RuntimeError(f"pipeline_climatique.py a retourné le code de sortie {result.returncode}")
    else:
        logger.info(f"[ClimatePipeline Output] : {result.stdout.strip().splitlines()[-1] if result.stdout.strip() else 'Succès'}")


def run_risk_pipeline_trigger():
    """Déclenche le pipeline complet des 20 étapes via l'endpoint asynchrone du backend."""
    url = f"{BACKEND_API_URL.rstrip('/')}/etl/risk-pipeline/start"
    headers = {"Content-Type": "application/json"}
    if API_TOKEN:
        headers["Authorization"] = f"Bearer {API_TOKEN}"

    logger.info(f"Déclenchement HTTP POST {url}...")
    try:
        response = requests.post(url, headers=headers, timeout=30)
        if response.status_code in (200, 201):
            data = response.json()
            job_id = data.get("jobId") or data.get("id") or "N/A"
            logger.info(f"Pipeline de risque démarré avec succès sur le backend (Job ID: {job_id})")
        else:
            logger.warning(
                f"Réponse HTTP {response.status_code} lors du déclenchement du pipeline de risque : {response.text[:300]}"
            )
    except requests.exceptions.RequestException as req_err:
        logger.warning(f"Impossible de joindre le backend pour lancer le pipeline de risque ({req_err}).")


def run_dwh_refresh():
    """Exécute le rafraîchissement du schéma en étoile du Data Warehouse (Spatial OLAP)."""
    script_path = ETL_DIR / "dwh" / "build_risk_star_schema.py"
    if not script_path.exists():
        raise FileNotFoundError(f"Script introuvable : {script_path}")

    env = os.environ.copy()
    env["PYTHONPATH"] = str(ETL_DIR)

    result = subprocess.run(
        [PYTHON_BIN, str(script_path)],
        cwd=str(ETL_DIR),
        env=env,
        capture_output=True,
        text=True,
        timeout=600,
    )

    if result.returncode != 0:
        logger.error(f"[DwhRefresh STDERR] :\n{result.stderr.strip()}")
        raise RuntimeError(f"build_risk_star_schema.py a retourné le code de sortie {result.returncode}")
    else:
        logger.info(f"[DwhRefresh Output] : {result.stdout.strip().splitlines()[-1] if result.stdout.strip() else 'Succès'}")


# --------------------------------------------------------------------------------------
# PROGRAMMATION & BOUCLE PRINCIPALE
# --------------------------------------------------------------------------------------

def setup_schedule():
    """Configure la planification des différentes tâches avec la bibliothèque 'schedule'."""
    job_count = 0

    if ENABLE_CYCLONE_SYNC:
        interval = max(1, CYCLONE_SYNC_INTERVAL_HOURS)
        schedule.every(interval).hours.do(safe_run_job, "Sync Cyclones Actifs (GDACS)", run_cyclone_sync)
        logger.info(f"  [Planifié] Sync Cyclones Actifs (GDACS) : toutes les {interval} heure(s)")
        job_count += 1

    if ENABLE_CLIMATE_SYNC:
        interval = max(1, CLIMATE_SYNC_INTERVAL_HOURS)
        schedule.every(interval).hours.do(safe_run_job, "Pipeline Climatique (NASA POWER)", run_climate_pipeline)
        logger.info(f"  [Planifié] Pipeline Climatique (NASA POWER) : toutes les {interval} heure(s)")
        job_count += 1

    if ENABLE_RISK_PIPELINE_CRON:
        interval = max(1, RISK_PIPELINE_INTERVAL_HOURS)
        schedule.every(interval).hours.do(safe_run_job, "Pipeline de Risque (Backend)", run_risk_pipeline_trigger)
        logger.info(f"  [Planifié] Pipeline de Risque Complet (Backend) : toutes les {interval} heure(s)")
        job_count += 1

    if ENABLE_DWH_REFRESH:
        interval = max(1, DWH_REFRESH_INTERVAL_HOURS)
        schedule.every(interval).hours.do(safe_run_job, "Rafraîchissement DWH (SOLAP)", run_dwh_refresh)
        logger.info(f"  [Planifié] Rafraîchissement DWH (SOLAP) : toutes les {interval} heure(s)")
        job_count += 1

    logger.info(f"Configuration du scheduler terminée : {job_count} tâche(s) active(s).")


def run_startup_cycle():
    """Exécute un cycle initial des tâches au démarrage du conteneur si activé."""
    if not RUN_ON_STARTUP:
        logger.info("RUN_ON_STARTUP=false : Pas d'exécution immédiate au démarrage.")
        return

    logger.info("=================================================================")
    logger.info("EXÉCUTION INITIALE AU DÉMARRAGE DU CONTENEUR (Startup Cycle)")
    logger.info("=================================================================")

    if ENABLE_CYCLONE_SYNC:
        safe_run_job("Sync Cyclones Actifs (GDACS - Initial)", run_cyclone_sync)

    if ENABLE_CLIMATE_SYNC:
        safe_run_job("Pipeline Climatique (NASA POWER - Initial)", run_climate_pipeline)

    if ENABLE_DWH_REFRESH:
        safe_run_job("Rafraîchissement DWH (SOLAP - Initial)", run_dwh_refresh)

    logger.info("=================================================================")
    logger.info("Cycle initial au démarrage terminé. Passage en mode veille.")
    logger.info("=================================================================")


def main():
    logger.info("=================================================================")
    logger.info("DÉMARRAGE DU PLANIFICATEUR ETL - MADAGASCAR GEO-DECISION SYSTEM")
    logger.info("=================================================================")
    logger.info(f"API Backend cible : {BACKEND_API_URL}")
    logger.info(f"Intervalles configurés : Cyclones={CYCLONE_SYNC_INTERVAL_HOURS}h | Climat={CLIMATE_SYNC_INTERVAL_HOURS}h | Risque={RISK_PIPELINE_INTERVAL_HOURS}h | DWH={DWH_REFRESH_INTERVAL_HOURS}h")

    setup_schedule()
    run_startup_cycle()

    logger.info("Boucle du planificateur active. En attente des prochaines échéances...")
    while is_running:
        schedule.run_pending()
        time.sleep(1)

    logger.info("Scheduler arrêté avec succès.")


if __name__ == "__main__":
    main()
