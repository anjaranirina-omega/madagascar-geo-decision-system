# Pipeline raster de risque — RISKCLIM-MG

Ce document résume le pipeline raster de RISKCLIM-MG.

## 1. Sources principales

```txt
CHIRPS                  → pluie
Copernicus DEM GLO-30   → pente
WorldPop                → population
ESA WorldCover          → occupation du sol
HydroRIVERS / HydroSHEDS→ hydrographie
NASA POWER              → climat régional
IBTrACS                 → trajectoires cycloniques historiques
```

## 2. Couches normalisées

```txt
rainfall_norm.tif
slope_norm.tif
population_norm.tif
landcover_norm.tif
river_proximity_norm.tif
```

## 3. Rasters de risque produits

### Global

```txt
risk_index.tif
risk_classified.tif
```

### Inondation

```txt
flood_hazard_index.tif
flood_risk_index.tif
flood_risk_classified.tif
```

### Sécheresse

```txt
drought_hazard_index.tif
drought_risk_index.tif
drought_risk_classified.tif
```

### Glissement de terrain

```txt
landslide_hazard_index.tif
landslide_risk_index.tif
landslide_risk_classified.tif
```

### Cyclone

```txt
cyclone_track_hazard_norm.tif
cyclone_hazard_index.tif
cyclone_risk_index.tif
cyclone_risk_classified.tif
```

## 4. Masquage Madagascar

Tous les rasters de sortie sont masqués avec la limite nationale de Madagascar issue de GADM.

Script :

```txt
etl/raster/mask_rasters_to_madagascar.py
```

Scopes disponibles :

```txt
normalized
risk
flood
drought
landslide
cyclone
all
```

## 5. Métadonnées raster

Les métadonnées raster sont enregistrées dans le backend via :

```txt
etl/raster/register_raster_metadata.py
```

Table backend :

```txt
raster_layers
```

Endpoints :

```txt
GET /api/rasters
GET /api/rasters/latest/:type
GET /api/rasters/latest/:type/file
```

## 6. Indicateurs zonaux

Les statistiques zonales sont calculées directement depuis les rasters pour chaque niveau administratif :

```txt
région
district
commune
```

Table générique :

```txt
zone_risk_indicators
```

Risques actuellement stockés :

```txt
FLOOD
DROUGHT
LANDSLIDE
CYCLONE
```

## 7. Orchestration

Le pipeline est orchestré par le backend NestJS via des jobs asynchrones.

Endpoints :

```txt
POST /api/etl/risk-pipeline/start
GET  /api/etl/risk-pipeline/jobs/:id
GET  /api/etl/risk-pipeline/jobs
```

L'ancien endpoint synchrone est conservé pour compatibilité :

```txt
POST /api/etl/risk-pipeline/run
```

## 8. Données générées

Les fichiers lourds ne doivent pas être commités :

```txt
*.tif
*.vrt
*.zip
*.csv générés
*.gpkg générés
shapefiles
```

Ils sont ignorés via `.gitignore`.
