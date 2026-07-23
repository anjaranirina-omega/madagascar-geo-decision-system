# ESA WorldCover — Occupation du sol raster

Ce dossier contient l’intégration de ESA WorldCover comme source réelle d’occupation du sol.

## Objectif

Remplacer la couche de démonstration :
landcover_norm.tif

par une vraie couche issue de ESA WorldCover.

## Source

ESA WorldCover fournit une classification globale de l’occupation du sol.
Les tuiles couvrant Madagascar doivent être placées dans :
etl/data/raster/raw/worldcover/tiles/

## Pipeline

ESA WorldCover tiles
↓
VRT
↓
Alignement sur la grille raster du projet
↓
Reclassification des classes
↓
landcover_norm.tif
↓
weighted_overlay.py
↓
risk_index.tif

## Classes ESA WorldCover

10  Tree cover
20  Shrubland
30  Grassland
40  Cropland
50  Built-up
60  Bare / sparse vegetation
70  Snow and ice
80  Permanent water bodies
90  Herbaceous wetland
95  Mangroves
100 Moss and lichen

## Reclassification utilisée

10  Tree cover               -> 0.30
20  Shrubland                -> 0.35
30  Grassland                -> 0.40
40  Cropland                 -> 0.65
50  Built-up                 -> 0.90
60  Bare / sparse vegetation -> 0.55
70  Snow and ice             -> 0.20
80  Permanent water bodies   -> 0.80
90  Herbaceous wetland       -> 0.85
95  Mangroves                -> 0.70
100 Moss and lichen          -> 0.30

## Commandes

Depuis le dossier etl :
cd etl
source .venv/bin/activate
python raster/worldcover/build_worldcover_vrt.py
python raster/worldcover/process_worldcover.py
python raster/worldcover/reclassify_worldcover.py
python raster/mask_rasters_to_madagascar.py --scope normalized
python raster/weighted_overlay.py
python raster/mask_rasters_to_madagascar.py --scope risk
python raster/raster_metadata.py

## Sorties

- etl/data/raster/processed/worldcover/landcover_worldcover_aligned.tif
- etl/data/raster/normalized/landcover_norm.tif

## Utilité dans l’indice de risque

L’occupation du sol représente une composante d’exposition et de vulnérabilité territoriale.
