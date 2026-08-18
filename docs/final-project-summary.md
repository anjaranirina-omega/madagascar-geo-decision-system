# Résumé final du projet — RISKCLIM-MG

RISKCLIM-MG est une plateforme géodécisionnelle multi-risques pour Madagascar.

## Risques couverts

- Risque global
- Inondation
- Sécheresse
- Glissement de terrain
- Cyclone historique
- Signaux opérationnels temps réel

## Données utilisées

- GADM
- CHIRPS
- Copernicus DEM GLO-30
- WorldPop
- ESA WorldCover
- HydroRIVERS / HydroSHEDS
- NASA POWER
- IBTrACS
- OpenWeather

## Chaîne de traitement

```txt
Sources
↓
ETL
↓
Rasters
↓
Statistiques zonales
↓
DWH
↓
SOLAP
↓
Dashboard / Carte / Rapports / Alertes
```

## Fonctionnalités

- authentification ;
- rôles ;
- carte Leaflet ;
- dashboard ;
- analyse multicritère ;
- pipeline asynchrone ;
- rapports ;
- historique ;
- comparaison ;
- alertes validées ;
- signaux opérationnels.

## Points forts

- données réelles ;
- pipeline reproductible ;
- architecture modulaire ;
- PostGIS ;
- DWH ;
- SOLAP ;
- multi-risques ;
- temps réel V1.

## Limites et perspectives

- SPI/SPEI pour sécheresse ;
- flow accumulation pour inondation ;
- géologie pour glissement ;
- GDACS/JTWC pour cyclone actif ;
- modèle global Aléa × Exposition × Vulnérabilité ;
- production avec queue de jobs et monitoring.
