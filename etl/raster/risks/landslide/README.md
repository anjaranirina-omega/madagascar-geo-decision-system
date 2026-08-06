# Modèle de risque glissement de terrain — V1

Ce modèle calcule un premier indice raster de risque de glissement de terrain pour Madagascar.

## Sources utilisées

- **Copernicus DEM GLO-30** : pente normalisée.
- **CHIRPS** : précipitations récentes normalisées.
- **ESA WorldCover** : sensibilité de l'occupation du sol.
- **WorldPop** : exposition humaine.

## Formule

### Aléa glissement
landslide_hazard = 0.45 × slope_norm + 0.35 × rainfall_norm + 0.20 × landcover_landslide_sensitivity

### Risque glissement
landslide_risk = 0.70 × landslide_hazard + 0.20 × population_norm + 0.10 × landcover_landslide_sensitivity

## Sorties

- `etl/data/raster/risk/landslide/landslide_hazard_index.tif`
- `etl/data/raster/risk/landslide/landslide_risk_index.tif`
- `etl/data/raster/risk/landslide/landslide_risk_classified.tif`

## Classification

- **1 = Faible**    (0–30)
- **2 = Moyen**     (31–60)
- **3 = Élevé**     (61–80)
- **4 = Critique**  (81–100)

## Limites

Cette V1 ne remplace pas un modèle géotechnique détaillé. Elle fournit un indice spatial décisionnel basé sur pente, pluie, occupation du sol et exposition.

### Améliorations futures :
- Intégrer lithologie / géologie si une source fiable est disponible.
- Intégrer distance aux routes / ruptures de pente.
- Utiliser pluie cumulée multi-jours pour déclenchement.
- Calibration avec inventaires historiques de glissements.
