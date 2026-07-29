# Modèle raster — Risque d’inondation

Ce dossier contient le modèle spécifique du risque d’inondation.

## Objectif

Produire une couche raster spécifique :
flood_risk_index.tif

distincte du risque global.

## Sources utilisées

Le modèle utilise des sources raster réelles déjà intégrées :
- rainfall_norm.tif    -> CHIRPS rainfall
- slope_norm.tif       -> Copernicus DEM GLO-30
- population_norm.tif  -> WorldPop
- landcover_norm.tif   -> ESA WorldCover

## Logique du modèle

Pour l’inondation, les zones à faible pente sont plus sensibles à l’accumulation d’eau.
On utilise donc :
inverse_slope = 1 - slope_norm

### Aléa inondation
flood_hazard = 0.60 × rainfall_norm + 0.40 × inverse_slope_norm

### Risque inondation
flood_risk = 0.65 × flood_hazard + 0.20 × population_norm + 0.15 × landcover_norm

## Sorties

- etl/data/raster/risk/flood/flood_hazard_index.tif
- etl/data/raster/risk/flood/flood_risk_index.tif
- etl/data/raster/risk/flood/flood_risk_classified.tif

## Classes

- 1 = Faible    (0–30)
- 2 = Moyen     (31–60)
- 3 = Élevé     (61–80)
- 4 = Critique  (81–100)

## Limite actuelle

Cette première version n’intègre pas encore la proximité hydrographique.
Une amélioration prévue consiste à ajouter une couche :
river_proximity_norm.tif

à partir de HydroSHEDS / HydroRIVERS.
