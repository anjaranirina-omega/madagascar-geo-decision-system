# CHIRPS Rainfall — Précipitations raster

Ce dossier contient l’intégration de CHIRPS comme source réelle de précipitations raster.

## Source

CHIRPS signifie :
Climate Hazards Group InfraRed Precipitation with Station data

Cette source fournit des précipitations sous forme raster.

## Objectif

Remplacer la couche de démonstration :
rainfall_norm.tif

par une vraie couche de précipitations issue de CHIRPS.

## Période utilisée

La période est définie dans `.env` :
CHIRPS_MONTHS=2023-12,2024-01,2024-02,2024-03,2024-04

Cette période correspond à un cumul saisonnier de la saison des pluies / saison cyclonique.

## Pipeline

CHIRPS monthly GeoTIFF
↓
Téléchargement
↓
Alignement sur la grille raster du projet
↓
Cumul saisonnier
↓
Normalisation 0–1
↓
rainfall_norm.tif
↓
weighted_overlay.py
↓
risk_index.tif

## Commandes

Depuis le dossier etl :
cd etl
source .venv/bin/activate
python raster/chirps/download_chirps.py
python raster/chirps/process_chirps.py
python raster/chirps/normalize_chirps.py
python raster/mask_rasters_to_madagascar.py --scope normalized
python raster/weighted_overlay.py
python raster/mask_rasters_to_madagascar.py --scope risk
python raster/raster_metadata.py

## Sorties

- etl/data/raster/raw/chirps/*.tif
- etl/data/raster/processed/chirps/rainfall_chirps_total.tif
- etl/data/raster/normalized/rainfall_norm.tif

## Remarque

Les fichiers CHIRPS téléchargés et générés ne sont pas versionnés dans Git.
