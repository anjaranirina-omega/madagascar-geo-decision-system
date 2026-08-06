# Data Warehouse — Schéma en étoile

Cette documentation décrit l'entrepôt décisionnel de RISKCLIM-MG.

## Objectif

Le Data Warehouse consolide les données opérationnelles dans un modèle décisionnel en étoile afin de préparer :

- le SOLAP ;
- les tableaux de bord analytiques ;
- les rapports ;
- les analyses multidimensionnelles.

## Schéma

Le schéma PostgreSQL utilisé est :

```txt
dwh
```

## Dimensions

### dwh.dim_time

Dimension temporelle.

Champs principaux :

```txt
time_key
full_date
year
quarter
month
day
week
day_of_week
is_weekend
```

### dwh.dim_zone

Dimension spatiale.

Contient :

```txt
region
district
commune
```

Champs principaux :

```txt
zone_key
zone_type
zone_id
zone_code
zone_nom
area_km2
geom
```

La géométrie est conservée afin de préparer le SOLAP spatial.

### dwh.dim_risk_type

Types de risque :

```txt
GLOBAL
FLOOD
DROUGHT
LANDSLIDE
CYCLONE
```

### dwh.dim_data_source

Sources de données :

```txt
CHIRPS
Copernicus DEM
WorldPop
ESA WorldCover
HydroRIVERS
NASA POWER
IBTrACS
OpenWeather
```

## Tables de faits

### dwh.fact_risk_indicator

Mesures de risque par zone, date et type de risque.

Mesures :

```txt
risk_mean
risk_max
hazard_mean
population_exposed
area_km2
risk_level
```

Sources opérationnelles :

```txt
zone_indicators
zone_risk_indicators
```

### dwh.fact_climate_observation

Observations climatiques issues de NASA POWER et autres sources futures.

Mesures :

```txt
temperature_mean
humidity_mean
wind_speed_mean
precipitation
```

### dwh.fact_raster_processing

Métadonnées des rasters calculés.

Mesures :

```txt
min_value
max_value
mean_value
width
height
```

## Script ETL

Le script de construction est :

```txt
etl/dwh/build_risk_star_schema.py
```

## Commande

Depuis `etl` :

```bash
python dwh/build_risk_star_schema.py
```

## Intégration pipeline

Le DWH est reconstruit après les calculs de risque et les statistiques zonales.

## Limites

Cette première version ne contient pas encore :

- fact_alert ;
- agrégats matérialisés SOLAP ;
- tables de snapshot historisées avancées.

Ces éléments seront ajoutés dans les features suivantes.
