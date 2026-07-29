# HydroSHEDS / HydroRIVERS — Proximité aux cours d’eau

Ce dossier contient l’intégration de HydroRIVERS, dérivé de HydroSHEDS, pour améliorer le modèle du risque d’inondation.

## Objectif

Créer une couche :
river_proximity_norm.tif

Cette couche indique la proximité aux cours d’eau :
- 1 = très proche d’une rivière
- 0 = loin des rivières

## Pipeline

HydroRIVERS Africa
↓
Extraction des rivières de Madagascar
↓
Rasterisation
↓
Calcul de distance aux rivières
↓
Normalisation inverse
↓
river_proximity_norm.tif

## Scripts

- download_hydrorivers.py
- extract_hydrorivers.py
- extract_madagascar_rivers.py
- compute_river_proximity.py

## Utilisation dans le modèle inondation

Le modèle d’aléa inondation utilise :
flood_hazard = 0.40 × rainfall_norm + 0.25 × inverse_slope_norm + 0.35 × river_proximity_norm

## Commandes

Depuis etl :
cd etl
source .venv/bin/activate
python raster/hydrosheds/download_hydrorivers.py
python raster/hydrosheds/extract_hydrorivers.py
python raster/hydrosheds/extract_madagascar_rivers.py
python raster/hydrosheds/compute_river_proximity.py
python raster/risks/flood/compute_flood_risk.py
python raster/mask_rasters_to_madagascar.py --scope flood
python raster/register_raster_metadata.py
