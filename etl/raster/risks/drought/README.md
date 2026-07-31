# Modèle de risque sécheresse — V1

Ce modèle calcule un premier indice raster de risque sécheresse pour Madagascar.

## Sources utilisées

- **NASA POWER** : température moyenne, précipitation cumulée récente, humidité, vent.
- **CHIRPS** : précipitation raster récente déjà intégrée dans `rainfall_norm.tif`.
- **ESA WorldCover** : sensibilité de l'occupation du sol.
- **WorldPop** : exposition humaine.

## Formule

### Déficit pluviométrique
Le déficit combine :
rainfall_deficit = 0.70 × déficit pluviométrique NASA POWER régional + 0.30 × déficit CHIRPS récent

### Aléa sécheresse
drought_hazard = 0.55 × rainfall_deficit + 0.30 × temperature_stress + 0.15 × landcover_sensitivity

### Risque sécheresse
drought_risk = 0.70 × drought_hazard + 0.20 × population_norm + 0.10 × landcover_sensitivity

## Sorties

- `etl/data/raster/risk/drought/drought_hazard_index.tif`
- `etl/data/raster/risk/drought/drought_risk_index.tif`
- `etl/data/raster/risk/drought/drought_risk_classified.tif`

## Classification

- **1 = Faible**    (0–30)
- **2 = Moyen**     (31–60)
- **3 = Élevé**     (61–80)
- **4 = Critique**  (81–100)

## Limites

Cette V1 n'est pas encore un SPI/SPEI complet. Elle fournit une estimation opérationnelle prudente à partir des données disponibles.

### Améliorations futures recommandées :
- SPI-1 / SPI-3 avec historique CHIRPS.
- Anomalies par rapport à une climatologie longue.
- Intégration de l'humidité du sol si une source fiable est ajoutée.
