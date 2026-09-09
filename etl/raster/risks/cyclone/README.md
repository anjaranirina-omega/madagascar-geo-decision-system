# Modèle de risque cyclonique — IBTrACS V1

Ce modèle calcule un indice raster de risque cyclonique historique pour Madagascar.

## Source principale

- **IBTrACS v04r01** — bassin South Indian Ocean (`SI`)
- **NOAA / NCEI**

IBTrACS fournit les trajectoires historiques, positions et intensités des cyclones.

## Sources complémentaires

- **CHIRPS** : pluie récente.
- **WorldPop** : exposition humaine.
- **ESA WorldCover** : vulnérabilité de l'occupation du sol.

## Aléa historique cyclonique

Le modèle construit un raster `cyclone_track_hazard_norm` à partir :
- de la proximité aux trajectoires cycloniques historiques ;
- de la densité des trajectoires ;
- de l’intensité des vents observés dans IBTrACS.

## Formule d’aléa

cyclone_hazard = 0.75 × cyclone_track_hazard_norm + 0.25 × rainfall_norm

## Formule de risque

cyclone_risk = 0.70 × cyclone_hazard + 0.20 × population_norm + 0.10 × landcover_cyclone_vulnerability

## Sorties

- `etl/data/raster/risk/cyclone/cyclone_track_hazard_norm.tif`
- `etl/data/raster/risk/cyclone/cyclone_hazard_index.tif`
- `etl/data/raster/risk/cyclone/cyclone_risk_index.tif`
- `etl/data/raster/risk/cyclone/cyclone_risk_classified.tif`

## Classification

- **1 = Faible**    (0–30)
- **2 = Moyen**     (31–60)
- **3 = Élevé**     (61–80)
- **4 = Critique**  (81–100)

## Surveillance des cyclones actifs en temps réel (Phase 1)

Le script `fetch_active_cyclones.py` permet de récupérer en direct les cyclones tropicaux actifs via l'API **GDACS** (Global Disaster Alert and Coordination System) :

```bash
# Exécution standard (bassin Sud-Ouest Océan Indien / Madagascar)
python etl/raster/risks/cyclone/fetch_active_cyclones.py

# Exécution pour tous les bassins mondiaux
python etl/raster/risks/cyclone/fetch_active_cyclones.py --all-basins

# Mode démo (simulation locale)
python etl/raster/risks/cyclone/fetch_active_cyclones.py --demo
```

