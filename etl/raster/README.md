# Pipeline Raster — Analyse des risques climatiques

Ce dossier contient les scripts ETL raster utilisés pour préparer les couches d'analyse spatiale.

## Pourquoi le raster ?

Les phénomènes climatiques sont continus dans l'espace. Ils sont donc mieux représentés par des grilles raster que par des objets vectoriels.

Exemples de couches raster :
- précipitations ;
- température ;
- altitude ;
- pente ;
- densité de population ;
- occupation du sol ;
- indice de vulnérabilité ;
- indice de risque final.

## Pipeline

Couches raster sources
↓
Prétraitement
↓
Reprojection / alignement
↓
Normalisation 0 → 1
↓
Pondération AHP
↓
Overlay pondéré
↓
Raster final d'indice de risque
↓
Classification faible / moyen / élevé / critique

## Scripts

### generate_demo_rasters.py
Génère des rasters de démonstration normalisés entre 0 et 1 :
- rainfall_norm.tif
- slope_norm.tif
- population_norm.tif
- landcover_norm.tif

### weighted_overlay.py
Combine les rasters avec des poids :
- rainfall   : 0.35
- slope      : 0.25
- population : 0.25
- landcover  : 0.15

Produit :
- risk_index.tif
- risk_classified.tif

## Classes de risque
- 1 = Faible (0–30)
- 2 = Moyen (31–60)
- 3 = Élevé (61–80)
- 4 = Critique (81–100)

## Exécution
Depuis la racine du projet :
cd etl
source .venv/bin/activate
python raster/generate_demo_rasters.py
python raster/weighted_overlay.py
python raster/raster_metadata.py

## Remarques importantes
Les rasters générés sont ignorés par Git. Ils doivent être régénérés localement ou remplacés par de vraies sources raster :
- CHIRPS pour les précipitations ;
- SRTM pour l'altitude et la pente ;
- WorldPop pour la population ;
- ESA WorldCover pour l'occupation du sol ;
- Copernicus / ERA5 pour les variables climatiques.
