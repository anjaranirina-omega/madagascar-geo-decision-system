# Sources de données — RISKCLIM-MG

Ce document décrit les sources utilisées par RISKCLIM-MG.

## GADM

- Rôle : limites administratives.
- Format : GeoPackage.
- Niveaux utilisés :
  - régions ;
  - districts ;
  - communes.
- Usage :
  - affichage cartographique ;
  - recherche ;
  - localisation ;
  - statistiques zonales ;
  - masque Madagascar.

## CHIRPS

- Rôle : précipitations.
- Format : GeoTIFF.
- Résolution native : environ 0,05°.
- Usage :
  - risque global ;
  - inondation ;
  - sécheresse ;
  - glissement ;
  - cyclone.

## Copernicus DEM GLO-30

- Rôle : relief / pente.
- Résolution native : environ 30 m.
- Usage :
  - pente ;
  - glissement ;
  - inondation ;
  - risque global.

## WorldPop

- Rôle : population exposée.
- Résolution native : environ 100 m.
- Usage :
  - population normalisée ;
  - exposition ;
  - indicateurs zonaux.

## ESA WorldCover

- Rôle : occupation du sol.
- Résolution native : 10 m.
- Usage :
  - vulnérabilité ;
  - sensibilité territoriale ;
  - modèles spécifiques.

## HydroRIVERS / HydroSHEDS

- Rôle : réseau hydrographique.
- Format : Shapefile vectoriel.
- Usage :
  - proximité aux rivières ;
  - modèle inondation.

## NASA POWER

- Rôle : climat journalier régional.
- Variables :
  - température ;
  - humidité ;
  - vent ;
  - précipitation.
- Usage :
  - sécheresse ;
  - indicateurs climatiques ;
  - rapports.

## IBTrACS

- Rôle : trajectoires cycloniques historiques.
- Format : CSV.
- Usage :
  - risque cyclonique historique.

## OpenWeather

- Rôle : météo actuelle / temps réel.
- Usage :
  - affichage météo ;
  - ingestion régionale ;
  - signaux opérationnels ;
  - alertes opérationnelles.
