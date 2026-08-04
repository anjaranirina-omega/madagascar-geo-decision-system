# SOLAP Risk Cube — RISKCLIM-MG

Ce document décrit le module SOLAP de RISKCLIM-MG.

## Objectif

Le module SOLAP permet d'analyser les risques selon plusieurs dimensions :

```txt
espace
temps
type de risque
niveau administratif
```

Il s'appuie sur le Data Warehouse :

```txt
dwh.fact_risk_indicator
dwh.dim_zone
dwh.dim_time
dwh.dim_risk_type
```

## Endpoints

### Risk cube

```txt
GET /api/solap/risk-cube
```

Paramètres :

```txt
riskType
zoneType
year
month
limit
```

Exemple :

```txt
/api/solap/risk-cube?riskType=FLOOD&zoneType=region&limit=10
```

### Risk summary

```txt
GET /api/solap/risk-summary
```

Agrège les risques par type de risque et niveau administratif.

Exemple :

```txt
/api/solap/risk-summary?zoneType=region
```

### Drill-down

```txt
GET /api/solap/risk-drilldown
```

Permet de descendre dans la hiérarchie spatiale :

```txt
region → district → commune
```

Paramètres :

```txt
riskType
fromLevel
zoneId
year
month
```

Exemple :

```txt
/api/solap/risk-drilldown?riskType=CYCLONE&fromLevel=region&zoneId=<id_region>
```

### Time series

```txt
GET /api/solap/risk-timeseries
```

Analyse temporelle des indicateurs de risque.

Paramètres :

```txt
riskType
zoneType
zoneId
```

## Opérations SOLAP couvertes

### Slice

Filtrer sur un risque :

```txt
riskType=FLOOD
```

### Dice

Filtrer sur plusieurs dimensions :

```txt
riskType=CYCLONE
zoneType=region
year=2026
```

### Drill-down

Descendre dans la hiérarchie spatiale :

```txt
region → district → commune
```

### Roll-up

Le roll-up est possible via les agrégations par :

```txt
zoneType
riskType
year
month
```

## Risques disponibles

```txt
GLOBAL
FLOOD
DROUGHT
LANDSLIDE
CYCLONE
```

## Limites

Cette première version expose des endpoints SOLAP analytiques.
Elle ne fournit pas encore une interface graphique SOLAP complète.
Le dashboard final pourra consommer ces endpoints dans une prochaine feature.
