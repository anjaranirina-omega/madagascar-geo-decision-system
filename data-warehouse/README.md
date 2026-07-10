# Data Warehouse Spatial

Schéma en étoile minimal :

- `dim_temps` : jour, mois, trimestre, année
- `dim_localisation` : région, district, commune, géométrie PostGIS
- `dim_risque` : cyclone, inondation, sécheresse, glissement de terrain
- `fait_vulnerabilite` : indice de risque, indice de vulnérabilité, niveau d'alerte
