# Méthodologie des modèles de risque — RISKCLIM-MG

Ce document décrit les modèles de risque actuellement implémentés dans RISKCLIM-MG.

Le système distingue deux niveaux :

1. **Risque climatique global**, calculé par pondération multicritère dynamique.
2. **Risques spécifiques**, calculés avec des modèles métier propres à chaque aléa.

Les modèles spécifiques actuellement disponibles sont :

- risque d'inondation ;
- risque de sécheresse ;
- risque de glissement de terrain ;
- risque cyclonique historique.

Les modèles produisent des rasters d'indice de risque sur Madagascar, puis des indicateurs zonaux par région, district et commune.

---

## 1. Principes généraux

### 1.1 Données raster et vectorielles

Le système combine :

- des données **raster** pour le calcul spatial du risque ;
- des données **vectorielles** pour les limites administratives, l'agrégation zonale et l'affichage.

Principe :

```txt
Raster = calcul spatial du risque
Vecteur = limites administratives, recherche, agrégation, affichage
```

### 1.2 Classification des risques

Tous les indices de risque sont exprimés sur une échelle :

```txt
0 à 100
```

Classification utilisée :

```txt
0–30     Faible
31–60    Moyen
61–80    Élevé
81–100   Critique
```

Dans les rasters classifiés :

```txt
1 = Faible
2 = Moyen
3 = Élevé
4 = Critique
```

### 1.3 Statistiques zonales

Les indicateurs par région, district et commune sont calculés directement à partir des rasters.

Méthode utilisée :

```txt
Cas A

Raster risque
      |
      ├── moyenne des pixels dans chaque commune
      ├── moyenne des pixels dans chaque district
      └── moyenne des pixels dans chaque région
```

Le système ne calcule pas les régions à partir de la moyenne simple des communes.

Cette méthode est plus correcte, car elle respecte :

- la surface réelle des zones ;
- la distribution réelle des pixels ;
- les différences de taille entre communes, districts et régions.

Les futures analyses SOLAP pourront utiliser des roll-up pondérés par la superficie ou par la population exposée.

## 2. Sources de données

### 2.1 CHIRPS

Source :

```txt
Climate Hazards Center InfraRed Precipitation with Station data
```

Usage :

- précipitations récentes ;
- risque global ;
- risque inondation ;
- risque sécheresse ;
- risque glissement de terrain ;
- risque cyclonique.

Couche produite :

```txt
rainfall_norm.tif
```

### 2.2 Copernicus DEM GLO-30

Usage :

- altitude ;
- pente ;
- risque global ;
- risque inondation ;
- risque glissement de terrain.

Couche produite :

```txt
slope_norm.tif
```

### 2.3 WorldPop

Usage :

- exposition humaine ;
- indicateurs zonaux ;
- pondération de la population exposée.

Couches utilisées :

```txt
population_norm.tif
population_worldpop_aligned.tif
```

### 2.4 ESA WorldCover

Usage :

- occupation du sol ;
- vulnérabilité / sensibilité territoriale ;
- modèles inondation, sécheresse, glissement et cyclone.

Couche produite :

```txt
landcover_norm.tif
```

### 2.5 HydroRIVERS / HydroSHEDS

Usage :

- réseau hydrographique ;
- proximité aux rivières ;
- risque d'inondation.

Couche produite :

```txt
river_proximity_norm.tif
```

### 2.6 NASA POWER

Usage :

- température ;
- humidité ;
- vent ;
- précipitations climatiques complémentaires ;
- modèle sécheresse.

Table produite :

```txt
climate_observations
```

### 2.7 IBTrACS

Usage :

- trajectoires cycloniques historiques ;
- intensité des cyclones ;
- aléa cyclonique historique.

Source :

```txt
International Best Track Archive for Climate Stewardship
```

Le modèle utilise le bassin :

```txt
South Indian Ocean
```

## 3. Risque climatique global

### 3.1 Objectif

Le risque global représente un indice composite général de vulnérabilité climatique.

Il ne correspond pas à un phénomène unique, mais à une combinaison multicritère.

### 3.2 Formule

Le risque global est calculé par overlay pondéré :

```txt
risk_global =
w_rainfall × rainfall_norm
+ w_slope × slope_norm
+ w_population × population_norm
+ w_landcover × landcover_norm
```

Puis :

```txt
risk_index = risk_global × 100
```

### 3.3 Poids dynamiques

Le risque global utilise les poids dynamiques définis dans le module d'analyse multicritère.

Exemples de critères :

```txt
RAINFALL
SLOPE
POPULATION
LANDCOVER
```

Ces poids sont modifiables depuis l'interface d'analyse multicritère.

### 3.4 Sorties

```txt
etl/data/raster/risk/risk_index.tif
etl/data/raster/risk/risk_classified.tif
```

## 4. Risque d'inondation

### 4.1 Objectif

Le modèle inondation estime les zones exposées à un risque d'inondation en combinant :

- pluie récente ;
- pente inversée ;
- proximité aux rivières ;
- population ;
- occupation du sol.

### 4.2 Aléa inondation

```txt
flood_hazard =
0.40 × rainfall_norm
+ 0.25 × inverse_slope_norm
+ 0.35 × river_proximity_norm
```

Avec :

```txt
inverse_slope_norm = 1 - slope_norm
```

La pente inversée est utilisée car les zones plus plates sont généralement plus favorables à l'accumulation d'eau.

### 4.3 Risque inondation

```txt
flood_risk =
0.65 × flood_hazard
+ 0.20 × population_norm
+ 0.15 × landcover_norm
```

Puis :

```txt
flood_risk_index = flood_risk × 100
```

### 4.4 Sorties

```txt
etl/data/raster/risk/flood/flood_hazard_index.tif
etl/data/raster/risk/flood/flood_risk_index.tif
etl/data/raster/risk/flood/flood_risk_classified.tif
```

### 4.5 Remarque méthodologique

Le modèle inondation est un modèle spécifique.
Il n'utilise pas directement les poids dynamiques du risque global, car la logique physique de l'inondation est différente.

## 5. Risque sécheresse

### 5.1 Objectif

Le modèle sécheresse estime les zones exposées à un stress hydrique récent.

Il ne considère pas une absence de pluie ponctuelle comme une sécheresse.
Il utilise une fenêtre temporelle récente issue de NASA POWER et CHIRPS.

### 5.2 Déficit pluviométrique

```txt
rainfall_deficit =
0.70 × déficit pluviométrique NASA POWER régional
+ 0.30 × déficit CHIRPS récent
```

### 5.3 Aléa sécheresse

```txt
drought_hazard =
0.55 × rainfall_deficit
+ 0.30 × temperature_stress
+ 0.15 × landcover_sensitivity
```

### 5.4 Risque sécheresse

```txt
drought_risk =
0.70 × drought_hazard
+ 0.20 × population_norm
+ 0.10 × landcover_sensitivity
```

Puis :

```txt
drought_risk_index = drought_risk × 100
```

### 5.5 Sorties

```txt
etl/data/raster/risk/drought/drought_hazard_index.tif
etl/data/raster/risk/drought/drought_risk_index.tif
etl/data/raster/risk/drought/drought_risk_classified.tif
```

### 5.6 Limite

Cette version n'est pas encore un SPI ou SPEI complet.
Une amélioration future pourra intégrer :

- SPI-1 ;
- SPI-3 ;
- anomalies historiques CHIRPS ;
- humidité du sol si une source fiable est ajoutée.

## 6. Risque de glissement de terrain

### 6.1 Objectif

Le modèle glissement de terrain estime les zones susceptibles d'être exposées aux mouvements de terrain en combinant :

- pente ;
- pluie récente ;
- occupation du sol ;
- exposition humaine.

### 6.2 Aléa glissement

```txt
landslide_hazard =
0.45 × slope_norm
+ 0.35 × rainfall_norm
+ 0.20 × landcover_landslide_sensitivity
```

### 6.3 Risque glissement

```txt
landslide_risk =
0.70 × landslide_hazard
+ 0.20 × population_norm
+ 0.10 × landcover_landslide_sensitivity
```

Puis :

```txt
landslide_risk_index = landslide_risk × 100
```

### 6.4 Sorties

```txt
etl/data/raster/risk/landslide/landslide_hazard_index.tif
etl/data/raster/risk/landslide/landslide_risk_index.tif
etl/data/raster/risk/landslide/landslide_risk_classified.tif
```

### 6.5 Limite

Cette V1 ne remplace pas un modèle géotechnique détaillé.
Une amélioration future pourra intégrer :

- lithologie ;
- géologie ;
- distance aux routes ;
- rupture de pente ;
- inventaires historiques de glissements.

## 7. Risque cyclonique historique

### 7.1 Objectif

Le modèle cyclonique estime l'exposition historique de Madagascar aux trajectoires cycloniques.

Il s'agit d'un risque de fond / climatologique, pas d'une prévision temps réel.

### 7.2 Source principale

Le modèle utilise :

```txt
IBTrACS South Indian Ocean
```

IBTrACS fournit :

- trajectoires historiques ;
- positions ;
- dates ;
- intensités de vent ;
- identifiants de cyclones.

### 7.3 Aléa cyclonique historique

Le raster intermédiaire :

```txt
cyclone_track_hazard_norm
```

est construit à partir de :

- proximité aux trajectoires cycloniques ;
- densité des trajectoires ;
- intensité des vents historiques.

### 7.4 Aléa cyclone

```txt
cyclone_hazard =
0.75 × cyclone_track_hazard_norm
+ 0.25 × rainfall_norm
```

### 7.5 Risque cyclone

```txt
cyclone_risk =
0.70 × cyclone_hazard
+ 0.20 × population_norm
+ 0.10 × landcover_cyclone_vulnerability
```

Puis :

```txt
cyclone_risk_index = cyclone_risk × 100
```

### 7.6 Sorties

```txt
etl/data/raster/risk/cyclone/cyclone_track_hazard_norm.tif
etl/data/raster/risk/cyclone/cyclone_hazard_index.tif
etl/data/raster/risk/cyclone/cyclone_risk_index.tif
etl/data/raster/risk/cyclone/cyclone_risk_classified.tif
```

### 7.7 Limite

Ce modèle est historique / climatologique.

Pour les alertes cycloniques en temps réel, il faudra ajouter une source opérationnelle spécialisée, par exemple :

- GDACS ;
- JTWC ;
- Météo-France La Réunion ;
- autre source officielle.

## 8. Poids dynamiques et poids spécifiques

### 8.1 Poids dynamiques actuels

Le module de pondération dynamique actuel concerne :

```txt
le risque climatique global
```

Il ne pilote pas encore automatiquement les modèles spécifiques.

### 8.2 Poids spécifiques

Les modèles spécifiques utilisent actuellement des pondérations expertes initiales.

Cela concerne :

- inondation ;
- sécheresse ;
- glissement de terrain ;
- cyclone.

Ces pondérations sont propres à chaque type de risque, car les facteurs physiques ne jouent pas le même rôle selon l'aléa.

### 8.3 Extension future

Une extension future pourra ajouter :

```txt
risk_specific_weights
```

ou :

```txt
risk_model_weights
```

avec :

```txt
risk_type
criterion
weight
```

Cela permettra une pondération dynamique ou AHP par type de risque.

## 9. Indicateurs zonaux

Les indicateurs zonaux sont stockés dans :

```txt
zone_risk_indicators
```

Pour les risques spécifiques :

```txt
risk_type = FLOOD
risk_type = DROUGHT
risk_type = LANDSLIDE
risk_type = CYCLONE
```

Les indicateurs calculés sont :

```txt
risk_mean
risk_max
hazard_mean
population_exposed
area_km2
risk_level
```

## 10. Pipeline ETL

Le pipeline ETL exécute les grandes étapes suivantes :

```txt
1. Synchronisation CHIRPS
2. Masquage des rasters normalisés
3. Calcul risque global
4. Calcul risque inondation
5. Calcul risque sécheresse
6. Calcul risque glissement de terrain
7. Calcul risque cyclonique
8. Masquage des rasters
9. Enregistrement des métadonnées
10. Statistiques zonales
```

Le pipeline est exécuté sous forme de job asynchrone pour éviter les erreurs réseau liées aux requêtes longues.

## 11. Alertes

Les modèles spécifiques ne génèrent pas automatiquement d'alertes à ce stade.

Les alertes spécifiques seront ajoutées plus tard, après validation complète :

- des rasters ;
- des indicateurs zonaux ;
- des seuils métier ;
- des sources temps réel lorsque nécessaire.

## 12. Limites générales

Les modèles actuels sont des modèles décisionnels spatiaux V1.
Ils sont basés sur des sources réelles, mais doivent être interprétés comme des indices d'aide à la décision, non comme des prévisions physiques exactes.

Améliorations futures :

- validation avec données historiques d'événements ;
- calibration des poids ;
- AHP spécifique par risque ;
- intégration de sources temps réel spécialisées ;
- data warehouse ;
- SOLAP ;
- rapports décisionnels.
