# WorldPop — Population raster

Ce dossier contient l’intégration de WorldPop comme source réelle de population raster.

## Objectif

Remplacer la couche de démonstration :
population_norm.tif

par une vraie couche de population issue de WorldPop.

## Source

WorldPop fournit des estimations de population sous forme raster.
La couche utilisée est une estimation de population count pour Madagascar.

## Variables d’environnement

Dans `.env` :
WORLDPOP_YEAR=2020
WORLDPOP_COUNTRY=MDG

## Pipeline

WorldPop population
↓
Téléchargement GeoTIFF
↓
Alignement sur la grille raster du projet
↓
Normalisation 0–1
↓
population_norm.tif
↓
weighted_overlay.py
↓
risk_index.tif

## Commandes

Depuis le dossier etl :
cd etl
source .venv/bin/activate
python raster/worldpop/download_worldpop.py
python raster/worldpop/process_worldpop.py
python raster/worldpop/normalize_worldpop.py
python raster/mask_rasters_to_madagascar.py --scope normalized
python raster/weighted_overlay.py
python raster/mask_rasters_to_madagascar.py --scope risk
python raster/raster_metadata.py

## Sorties

- etl/data/raster/raw/worldpop/*.tif
- etl/data/raster/processed/worldpop/population_worldpop_aligned.tif
- etl/data/raster/normalized/population_norm.tif

## Utilité dans l’indice de risque

La population représente l’exposition humaine :
0 = faible exposition
1 = forte exposition

Une zone fortement peuplée a une vulnérabilité plus importante face aux aléas climatiques.
