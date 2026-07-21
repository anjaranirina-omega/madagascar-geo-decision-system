# Copernicus DEM GLO-30 — Calcul de pente raster

Ce dossier contient l'intégration d'une vraie source raster topographique : Copernicus DEM GLO-30 via OpenTopography.

## Source

Produit utilisé :
COP30

COP30 correspond à Copernicus DEM GLO-30, un modèle numérique d'élévation global d'environ 30 m.

## Variables d'environnement

Dans `.env` à la racine :
OPENTOPOGRAPHY_API_KEY=your_api_key
OPENTOPOGRAPHY_DEM_TYPE=COP30
DEM_TILE_SIZE_DEGREES=1.0

## Pipeline

OpenTopography COP30
↓
Téléchargement par tuiles GeoTIFF
↓
Mosaïque DEM Madagascar
↓
Reprojection en CRS métrique
↓
Calcul de pente
↓
Normalisation 0–1
↓
slope_norm.tif
↓
Calcul risk_index.tif

## Commandes

Depuis le dossier etl :
cd etl
source .venv/bin/activate
python raster/dem/download_dem_opentopography.py
python raster/dem/mosaic_dem.py
python raster/dem/compute_slope_from_dem.py
python raster/weighted_overlay.py
python raster/raster_metadata.py

## Sorties

- etl/data/raster/raw/dem/tiles/*.tif
- etl/data/raster/raw/dem/dem_madagascar.tif
- etl/data/raster/processed/dem/dem_madagascar_metric.tif
- etl/data/raster/processed/dem/slope_metric.tif
- etl/data/raster/normalized/slope_norm.tif
- etl/data/raster/risk/risk_index.tif

## Remarque

Les fichiers raster générés ne sont pas versionnés dans Git.
