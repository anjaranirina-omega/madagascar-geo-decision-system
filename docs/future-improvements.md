# Améliorations futures — RISKCLIM-MG

Ce document liste les améliorations prévues pour les prochaines versions.

## 1. Pondérations spécifiques par risque

Actuellement :

- les poids dynamiques pilotent le risque global ;
- les modèles spécifiques utilisent des poids experts fixes.

Amélioration future :

```txt
risk_model_weights
```

Champs possibles :

```txt
risk_type
criterion
weight
description
```

Cela permettra une pondération dynamique ou AHP par risque.

## 2. Data warehouse

Créer un entrepôt décisionnel avec :

```txt
dim_time
dim_zone
dim_risk_type
dim_data_source
fact_risk_indicator
fact_climate_observation
fact_alert
fact_raster_processing
```

## 3. SOLAP

Créer un module Spatial OLAP permettant :

```txt
slice
dice
drill-down
roll-up
analyse spatiale
analyse temporelle
```

Dimensions :

```txt
espace
temps
type de risque
source de données
niveau administratif
```

## 4. Dashboard final

Refondre le dashboard avec des données réelles :

```txt
KPI multi-risques
répartition des risques
top zones exposées
sources de données
activité ETL
derniers traitements
```

Sans module intervention.

## 5. Rapports

Ajouter :

```txt
PDF
Excel
CSV
```

Rapports possibles :

```txt
rapport national
rapport régional
rapport par type de risque
rapport sources de données
rapport ETL
```

## 6. Alertes spécifiques

Les alertes spécifiques doivent être ajoutées seulement après validation des modèles.

Exemples :

```txt
alerte inondation
alerte sécheresse
alerte glissement
alerte cyclone
```

Elles devront utiliser :

- indicateurs zonaux spécifiques ;
- seuils métier ;
- données météo ou événementielles lorsque nécessaire.

## 7. Cyclone temps réel

Le modèle cyclone actuel est historique / climatologique via IBTrACS.

Pour les événements actifs, une source opérationnelle pourra être intégrée :

```txt
GDACS
JTWC
Météo-France La Réunion
```

## 8. Validation métier

Prévoir :

```txt
comparaison avec événements historiques
validation avec experts
calibration des seuils
analyse de sensibilité
```
