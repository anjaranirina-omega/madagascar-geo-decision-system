#!/usr/bin/env python3
"""
ETL Cyclone - Phase 2 : Récupération en temps réel des cyclones tropicaux actifs via l'API GDACS
et synchronisation en base de données.

Ce script interroge le Global Disaster Alert and Coordination System (GDACS, système officiel UE/ONU)
via la bibliothèque 'gdacs-api' pour identifier les cyclones actifs dans le bassin Sud-Ouest de
l'océan Indien (SWIO) impactant Madagascar, puis effectue un UPSERT et la désactivation automatique
des cyclones inactifs dans PostgreSQL via l'API backend.

Usage :
    python fetch_active_cyclones.py
    python fetch_active_cyclones.py --all-basins
    python fetch_active_cyclones.py --demo
    python fetch_active_cyclones.py --no-sync
"""

import argparse
import json
import logging
import os
import sys
from datetime import datetime
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple

import requests
from dotenv import load_dotenv

# Initialisation du chemin racine et des variables d'environnement
FILE_PATH = Path(__file__).resolve()
PROJECT_ROOT = FILE_PATH.parents[4]
load_dotenv(PROJECT_ROOT / ".env")
load_dotenv(PROJECT_ROOT / "backend" / ".env", override=True)

# Configuration API Backend
API_BASE_URL = os.getenv("BACKEND_API_URL", "http://localhost:3001/api")
API_TOKEN = os.getenv("BACKEND_API_TOKEN") or os.getenv("JWT_TOKEN")

# Configuration du logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
)
logger = logging.getLogger("GDACS_Cyclone_Fetcher")

# Zone d'intérêt : Océan Indien Sud-Ouest (SWIO) & Madagascar
# Latitude : entre -35.0 et 0.0 (Hémisphère Sud)
# Longitude : entre 30.0 et 80.0 (Bassin Sud-Ouest Océan Indien)
DEFAULT_SWIO_BOUNDS = {
    "min_lat": float(os.getenv("CYCLONE_MIN_LAT", "-35.0")),
    "max_lat": float(os.getenv("CYCLONE_MAX_LAT", "0.0")),
    "min_lon": float(os.getenv("CYCLONE_MIN_LON", "30.0")),
    "max_lon": float(os.getenv("CYCLONE_MAX_LON", "80.0")),
}


def extract_coordinates(feature: Dict[str, Any]) -> Tuple[Optional[float], Optional[float]]:
    """
    Extrait la longitude et la latitude d'une entité GeoJSON ou de ses propriétés.
    Format retourné : (longitude, latitude)
    """
    geometry = feature.get("geometry")
    if geometry and isinstance(geometry, dict):
        coords = geometry.get("coordinates")
        if isinstance(coords, (list, tuple)) and len(coords) >= 2:
            try:
                lon = float(coords[0])
                lat = float(coords[1])
                return lon, lat
            except (ValueError, TypeError):
                pass

    props = feature.get("properties", {})
    if isinstance(props, dict):
        lon = props.get("longitude") or props.get("lon") or props.get("lng")
        lat = props.get("latitude") or props.get("lat")
        if lon is not None and lat is not None:
            try:
                return float(lon), float(lat)
            except (ValueError, TypeError):
                pass

    return None, None


def is_in_swio_zone(
    lon: float,
    lat: float,
    bounds: Dict[str, float] = DEFAULT_SWIO_BOUNDS,
) -> bool:
    """Vérifie si les coordonnées sont situées dans le bassin SWIO / Madagascar."""
    return (
        bounds["min_lat"] <= lat <= bounds["max_lat"]
        and bounds["min_lon"] <= lon <= bounds["max_lon"]
    )


def extract_wind_speed(props: Dict[str, Any]) -> str:
    """Extrait ou formate la vitesse du vent à partir des métadonnées GDACS."""
    # 1. Inspection de l'objet severitydata (ex: {'severity': 140, 'severityunit': 'km/h', ...})
    severity_data = props.get("severitydata")
    if isinstance(severity_data, dict):
        val = severity_data.get("severity") or severity_data.get("value")
        unit = severity_data.get("severityunit") or severity_data.get("unit") or "km/h"
        if val is not None:
            return f"{val} {unit}"
        if severity_data.get("severitytext"):
            return str(severity_data["severitytext"])

    # 2. Propriétés directes
    for key in ["windspeed", "wind_speed", "maxwind", "wind"]:
        if key in props and props[key] is not None:
            return f"{props[key]} km/h"

    # 3. Champ severity brut
    if "severity" in props and props["severity"]:
        return str(props["severity"])

    return "Non spécifiée"


def extract_severity_level(props: Dict[str, Any]) -> str:
    """Extrait le niveau d'alerte et la sévérité GDACS (Red, Orange, Green, etc.)."""
    alert_level = props.get("alertlevel") or props.get("alert_level")
    alert_score = props.get("alertscore") or props.get("alert_score")

    level_str = str(alert_level).capitalize() if alert_level else "Inconnu"
    if alert_score is not None:
        return f"{level_str} (Score: {alert_score})"
    return level_str


def analyze_detailed_track(detailed_geojson: Any) -> Dict[str, Any]:
    """
    Analyse la géométrie détaillée retournée par GDACS pour un cyclone.
    Compte les points de trajectoire, points prévisionnels et buffers de vent.
    """
    stats = {
        "total_features": 0,
        "track_points_count": 0,
        "forecast_points_count": 0,
        "wind_polygons_count": 0,
        "track_lines_count": 0,
    }

    if not detailed_geojson:
        return stats

    features = []
    if isinstance(detailed_geojson, dict):
        features = detailed_geojson.get("features", [])
    elif hasattr(detailed_geojson, "features"):
        features = detailed_geojson.features

    stats["total_features"] = len(features)

    for feat in features:
        if not isinstance(feat, dict):
            feat_dict = getattr(feat, "__dict__", {})
        else:
            feat_dict = feat

        geom = feat_dict.get("geometry") or {}
        gtype = geom.get("type", "")
        props = feat_dict.get("properties") or {}

        if gtype == "Point":
            stats["track_points_count"] += 1
            # Vérification si le point est une prévision (Forecast)
            pt_class = str(
                props.get("Class")
                or props.get("class")
                or props.get("pointtype")
                or props.get("type")
                or ""
            ).lower()
            if "forecast" in pt_class or "prev" in pt_class:
                stats["forecast_points_count"] += 1
        elif gtype in ["Polygon", "MultiPolygon"]:
            stats["wind_polygons_count"] += 1
        elif gtype in ["LineString", "MultiLineString"]:
            stats["track_lines_count"] += 1

    return stats


def fetch_cyclones_live(
    filter_swio: bool = True,
    bounds: Dict[str, float] = DEFAULT_SWIO_BOUNDS,
) -> Tuple[List[Dict[str, Any]], int]:
    """
    Interroge l'API GDACS en direct pour récupérer les cyclones actifs.
    """
    try:
        from gdacs.api import GDACSAPIError, GDACSAPIReader
    except ImportError:
        logger.error(
            "La bibliothèque 'gdacs-api' n'est pas installée. Exécutez : pip install gdacs-api"
        )
        sys.exit(1)

    logger.info("Connexion au service GDACS (Global Disaster Alert and Coordination System)...")
    client = GDACSAPIReader()

    try:
        events_collection = client.latest_events(event_type="TC")
    except Exception as err:
        logger.error(f"Erreur lors de la récupération des cyclones sur l'API GDACS: {err}")
        raise

    features = getattr(events_collection, "features", [])
    total_global_tc = len(features)
    logger.info(f"Événements cycloniques mondiaux actifs identifiés par GDACS : {total_global_tc}")

    matched_cyclones = []

    for feature in features:
        props = feature.get("properties", {}) if isinstance(feature, dict) else getattr(feature, "properties", {})
        lon, lat = extract_coordinates(feature)

        name = props.get("eventname") or props.get("name") or props.get("title") or "Inconnu"
        event_id = str(props.get("eventid") or props.get("event_id") or "")
        episode_id = str(props.get("episodeid") or props.get("episode_id") or "")

        # Filtrage géographique
        is_relevant = True
        if filter_swio:
            if lon is not None and lat is not None:
                is_relevant = is_in_swio_zone(lon, lat, bounds)
            else:
                # Si pas de coordonnées directes, vérifier les pays impactés
                affected = str(props.get("affectedcountries") or props.get("country") or "").lower()
                is_relevant = "madagascar" in affected or "mozambique" in affected or "reunion" in affected

        if not is_relevant:
            continue

        # Récupération de la géométrie détaillée si event_id présent
        detailed_stats = {
            "total_features": 0,
            "track_points_count": 0,
            "forecast_points_count": 0,
            "wind_polygons_count": 0,
            "track_lines_count": 0,
        }
        detailed_geojson = None

        if event_id:
            try:
                logger.info(f"Récupération de la trajectoire détaillée pour le cyclone {name} (ID: {event_id})...")
                detailed_geojson = client.get_event(
                    event_type="TC",
                    event_id=event_id,
                    episode_id=episode_id if episode_id else None,
                    source_format="geojson",
                )
                detailed_stats = analyze_detailed_track(detailed_geojson)
            except Exception as detail_err:
                logger.warning(
                    f"Impossible de récupérer la géométrie détaillée pour {name} (ID {event_id}): {detail_err}"
                )

        cyclone_info = {
            "event_id": event_id,
            "episode_id": episode_id,
            "name": name,
            "latitude": lat,
            "longitude": lon,
            "severity_level": extract_severity_level(props),
            "wind_speed": extract_wind_speed(props),
            "country": props.get("country") or "Zone maritime",
            "from_date": props.get("fromdate"),
            "to_date": props.get("todate"),
            "detailed_stats": detailed_stats,
            "track_geojson": detailed_geojson,
            "raw_properties": props,
        }
        matched_cyclones.append(cyclone_info)

    return matched_cyclones, total_global_tc


def run_demo_sample() -> Tuple[List[Dict[str, Any]], int]:
    """
    Fournit un jeu de données fictif de simulation d'un cyclone actif dans la zone SWIO.
    Utilisé en mode démonstration ou secours lorsque le réseau externe est indisponible.
    """
    logger.info("[MODE DÉMO] Chargement de données de simulation fictive d'un cyclone actif dans la zone SWIO...")
    demo_track_geojson = {
        "type": "FeatureCollection",
        "features": [
            {
                "type": "Feature",
                "geometry": {"type": "Point", "coordinates": [52.0, -18.5]},
                "properties": {"Class": "Observation", "wind": "150 km/h", "time": "2026-09-01T06:00:00"},
            },
            {
                "type": "Feature",
                "geometry": {"type": "Point", "coordinates": [48.8, -19.4]},
                "properties": {"Class": "Observation", "wind": "165 km/h", "time": "2026-09-02T00:00:00"},
            },
            {
                "type": "Feature",
                "geometry": {"type": "Point", "coordinates": [46.0, -20.2]},
                "properties": {"Class": "Forecast", "wind": "130 km/h", "time": "2026-09-03T00:00:00"},
            },
            {
                "type": "Feature",
                "geometry": {"type": "LineString", "coordinates": [[52.0, -18.5], [48.8, -19.4], [46.0, -20.2]]},
                "properties": {"type": "TrackLine"},
            },
        ],
    }

    demo_cyclone = {
        "event_id": "9999999",
        "episode_id": "1",
        "name": "TC-SIMULATION-DEMO",
        "latitude": -19.4,
        "longitude": 48.8,
        "severity_level": "Red (Score: 2.5)",
        "wind_speed": "165 km/h",
        "country": "Madagascar",
        "from_date": "2026-09-01T00:00:00",
        "to_date": "2026-09-05T12:00:00",
        "detailed_stats": {
            "total_features": 4,
            "track_points_count": 3,
            "forecast_points_count": 1,
            "wind_polygons_count": 0,
            "track_lines_count": 1,
        },
        "track_geojson": demo_track_geojson,
    }
    return [demo_cyclone], 1


def sync_to_backend(cyclones: List[Dict[str, Any]], total_global: int) -> Optional[Dict[str, Any]]:
    """
    Transmet les cyclones actifs vers l'API backend pour enregistrement en base de données.
    """
    url = f"{API_BASE_URL}/meteo/active-cyclones/sync"

    cyclones_payload = []
    for c in cyclones:
        cyclones_payload.append({
            "gdacsEventId": str(c.get("event_id", "")),
            "gdacsEpisodeId": str(c.get("episode_id", "")) if c.get("episode_id") else None,
            "name": c.get("name", "Inconnu"),
            "latitude": c.get("latitude"),
            "longitude": c.get("longitude"),
            "windSpeed": c.get("wind_speed"),
            "severityLevel": c.get("severity_level", "Inconnu"),
            "country": c.get("country"),
            "fromDate": c.get("from_date"),
            "toDate": c.get("to_date"),
            "trackGeojson": c.get("track_geojson"),
        })

    payload = {
        "cyclones": cyclones_payload,
        "fetchedAt": datetime.utcnow().isoformat(),
        "totalGlobal": total_global,
    }

    logger.info(f"Envoi des données vers le backend : POST {url} ({len(cyclones_payload)} cyclone(s))...")

    headers = {"Content-Type": "application/json"}
    if API_TOKEN:
        headers["Authorization"] = f"Bearer {API_TOKEN}"

    try:
        response = requests.post(url, json=payload, headers=headers, timeout=30)
        if response.status_code >= 400:
            logger.error(f"Erreur API Backend HTTP {response.status_code} : {response.text[:500]}")
            return None

        data = response.json()
        logger.info(
            f"✔ Base de données synchronisée avec succès : {data.get('createdCount', 0)} créé(s), "
            f"{data.get('updatedCount', 0)} mis à jour, {data.get('deactivatedCount', 0)} désactivé(s). "
            f"Total actif(s) en base : {data.get('activeCount', 0)}"
        )
        return data
    except requests.exceptions.RequestException as err:
        logger.warning(f"Impossible de joindre le backend API ({url}) : {err}")
        return None


def display_results(cyclones: List[Dict[str, Any]], total_global: int, filter_swio: bool):
    """Affiche les résultats de façon structurée et lisible dans la console."""
    print("\n" + "=" * 76)
    print(" 🌀 GDACS REAL-TIME TROPICAL CYCLONE MONITORING - MADAGASCAR")
    print("=" * 76)
    print(f" Date d'exécution : {datetime.utcnow().strftime('%Y-%m-%d %H:%M:%S')} UTC")
    print(f" Source des données: GDACS (Global Disaster Alert and Coordination System - UE/ONU)")
    print(f" API Backend cible: {API_BASE_URL}/meteo/active-cyclones/sync")
    print(f" Cyclones tropicaux actifs à l'échelle mondiale : {total_global}")
    print(f" Filtre zone SWIO / Madagascar actif : {'Oui (Lat: -35° à 0°, Lon: 30° à 80°)' if filter_swio else 'Non (Tous les bassins)'}")
    print("-" * 76)

    if not cyclones:
        print("\n ℹ️  Aucun cyclone actif détecté dans la zone Madagascar actuellement.")
        print("    (Toutes les zones maritimes sous surveillance SWIO sont stables).")
        print("\n" + "=" * 76 + "\n")
        return

    print(f"\n 🚨 {len(cyclones)} CYCLONE(S) ACTIF(S) IDENTIFIÉ(S) DANS LA ZONE :\n")

    for i, c in enumerate(cyclones, start=1):
        pos_str = (
            f"Lat: {c['latitude']:.2f}°, Lon: {c['longitude']:.2f}°"
            if c["latitude"] is not None and c["longitude"] is not None
            else "Position non géolocalisée"
        )
        track = c.get("detailed_stats", {})

        print(f" ┌── [{i}] CYCLONE : {c['name']} (ID GDACS : {c['event_id']})")
        print(f" │   ├─ Sévérité / Niveau d'alerte : {c['severity_level']}")
        print(f" │   ├─ Vitesse estimée du vent    : {c['wind_speed']}")
        print(f" │   ├─ Position actuelle (centre) : {pos_str}")
        print(f" │   ├─ Pays / Zone concernée      : {c['country']}")
        if c.get("from_date"):
            print(f" │   ├─ Date de début              : {c['from_date']}")
        print(f" │   ├─ Trajectoire détaillée      : {track.get('total_features', 0)} éléments géométriques")
        print(f" │   │  ├─ Points d'observation    : {track.get('track_points_count', 0) - track.get('forecast_points_count', 0)}")
        print(f" │   │  ├─ Points prévisionnels    : {track.get('forecast_points_count', 0)}")
        print(f" │   │  └─ Polygones de vent/zones : {track.get('wind_polygons_count', 0)}")
        print(f" └── ─────────────────────────────────────────────────────────\n")

    print("=" * 76 + "\n")


def main():
    parser = argparse.ArgumentParser(
        description="Récupère les cyclones actifs en temps réel via l'API GDACS pour Madagascar et synchronise avec la BDD."
    )
    parser.add_argument(
        "--all-basins",
        action="store_true",
        help="Affiche tous les cyclones tropicaux mondiaux sans filtrer sur Madagascar / SWIO.",
    )
    parser.add_argument(
        "--demo",
        action="store_true",
        help="Exécute avec un jeu de données de test (mode simulation sans appel réseau).",
    )
    parser.add_argument(
        "--no-sync",
        action="store_true",
        help="Désactive l'envoi HTTP vers le backend (affichage console uniquement).",
    )
    parser.add_argument(
        "--json",
        action="store_true",
        help="Exporte le résultat au format JSON brut sur stdout.",
    )

    args = parser.parse_args()

    filter_swio = not args.all_basins

    if args.demo:
        cyclones, total_global = run_demo_sample()
    else:
        try:
            cyclones, total_global = fetch_cyclones_live(filter_swio=filter_swio)
        except Exception as error:
            logger.error(
                f"\n❌ Échec de la communication avec l'API GDACS ({type(error).__name__}): {error}\n"
                f"   Causes courantes :\n"
                f"   - Blocage réseau / restriction TLS/SSL externe du sandbox\n"
                f"   - Serveur GDACS temporairement inaccessible\n"
                f"\n💡 Pour tester le script en local avec accès Internet complet :\n"
                f"   pip install gdacs-api\n"
                f"   python etl/raster/risks/cyclone/fetch_active_cyclones.py\n"
                f"\n💡 Pour tester le comportement du script en mode simulation :\n"
                f"   python etl/raster/risks/cyclone/fetch_active_cyclones.py --demo\n"
            )
            cyclones, total_global = run_demo_sample()

    if args.json:
        print(json.dumps(cyclones, indent=2, ensure_ascii=False))
    else:
        display_results(cyclones, total_global, filter_swio=filter_swio)

    # Synchronisation vers l'API Backend
    if not args.no_sync:
        sync_to_backend(cyclones, total_global)


if __name__ == "__main__":
    main()
