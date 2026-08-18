# RISKCLIM-MG — Système géodécisionnel climatique pour Madagascar

RISKCLIM-MG est une plateforme géodécisionnelle spatiale destinée à l'analyse, la visualisation et l'aide à la décision face aux risques climatiques à Madagascar.

Le système transforme des données géographiques, climatiques, environnementales et démographiques réelles en :

- cartes raster de risque ;
- indicateurs zonaux par région, district et commune ;
- tableau de bord décisionnel ;
- rapports PDF / Excel / CSV ;
- entrepôt de données décisionnel ;
- endpoints SOLAP ;
- alertes validées et signaux opérationnels temps réel.

---

## Objectifs

Le projet vise à fournir une chaîne complète :

```txt
Sources de données réelles
↓
ETL spatial / climatique
↓
Rasters de risque
↓
Statistiques zonales
↓
Data Warehouse / SOLAP
↓
Dashboard / carte / rapports / alertes
```

Le système couvre actuellement les risques suivants :

- risque climatique global ;
- inondation ;
- sécheresse ;
- glissement de terrain ;
- cyclone historique ;
- signaux opérationnels temps réel basés sur OpenWeather.

## Stack technique

### Frontend

```txt
React
Vite
TypeScript
Tailwind CSS
Leaflet / React-Leaflet
GeoRaster
Axios
Zustand
Lucide React
```

### Backend

```txt
NestJS
TypeORM
PostgreSQL / PostGIS
JWT
Swagger
Scheduler NestJS
Socket.io
PDFKit
ExcelJS
```

### ETL / Géospatial

```txt
Python
Rasterio
GeoPandas
NumPy
SciPy
GDAL
Pillow
SQLAlchemy
```

### Base de données

```txt
PostgreSQL
PostGIS
Schéma opérationnel
Schéma DWH
Tables SOLAP
```

## Sources de données

| Source | Rôle |
|---|---|
| GADM | Limites administratives : régions, districts, communes |
| CHIRPS | Précipitations satellitaires |
| Copernicus DEM GLO-30 | Relief et pente |
| WorldPop | Population exposée |
| ESA WorldCover | Occupation du sol |
| HydroRIVERS / HydroSHEDS | Réseau hydrographique |
| NASA POWER | Température, humidité, vent, précipitations climatiques |
| IBTrACS | Trajectoires cycloniques historiques |
| OpenWeather | Météo actuelle / ingestion temps réel |

## Modules principaux

```txt
backend/       API NestJS, sécurité, risques, alertes, rapports, DWH/SOLAP
frontend/      Interface React, carte, dashboard, rapports, alertes
etl/           Pipelines Python raster, climat, DWH, rapports
docs/          Documentation méthodologique, technique et utilisateur
infra/         Infrastructure éventuelle
scripts/       Scripts utilitaires
```

## Fonctionnalités principales

### Authentification et rôles

- connexion sécurisée ;
- JWT ;
- gestion des utilisateurs ;
- demandes de compte ;
- rôles administrateur / analyste / décideur / agent terrain.

### Géographie

- import GADM Madagascar ;
- 22 régions ;
- 110 districts ;
- 1433 communes ;
- API GeoJSON ;
- localisation lat/lng ;
- recherche administrative.

### Rasters et modèles de risque

- pipeline raster complet ;
- harmonisation sur une grille commune ;
- normalisation ;
- modèles multi-risques ;
- masquage Madagascar ;
- métadonnées raster ;
- API /rasters/latest/:type/file.

### Carte interactive

- carte Leaflet ;
- couches raster multi-risques ;
- limites administratives ;
- recherche ;
- marqueur mobile ;
- risque local ;
- météo actuelle.

### Analyse multicritère

- poids dynamiques du risque global ;
- poids dynamiques par modèle spécifique ;
- séparation Aléa / Risque ;
- application des poids au prochain pipeline ETL.

### Pipeline ETL

- orchestration asynchrone ;
- suivi de jobs ;
- recalcul des rasters ;
- statistiques zonales ;
- DWH ;
- cartes raster pour rapports ;
- alertes validées.

### Dashboard

- KPI multi-risques ;
- distribution des risques ;
- top zones exposées ;
- comparaison par région ;
- sources de données ;
- jobs ETL ;
- indicateurs climatiques ;
- rasters actifs.

### Rapports

- rapport national PDF ;
- Excel national multi-feuilles ;
- exports CSV ;
- top zones PDF / Excel / CSV ;
- cartes raster intégrées dans les PDF ;
- historique des rapports générés ;
- comparaison de périodes.

### Alertes et temps réel

- alertes validées par indicateurs zonaux ;
- ingestion OpenWeather par région ;
- signaux opérationnels temps réel ;
- alertes opérationnelles issues des signaux.

### DWH / SOLAP

- schéma en étoile ;
- dimensions temps, zone, risque, source ;
- faits risque, climat, raster ;
- endpoints SOLAP :
  - slice ;
  - dice ;
  - drill-down ;
  - roll-up ;
  - séries temporelles.

## Démarrage local

### 1. Base de données

```bash
docker compose up -d postgres-postgis
```

Selon la configuration locale, la base est généralement accessible sur :

```txt
localhost:5433
```

### 2. Backend

```bash
cd backend
cp .env.example .env
npm install
npm run start:dev
```

Backend :

```txt
http://localhost:3001/api
```

Swagger :

```txt
http://localhost:3001/api/docs
```

### 3. Frontend

```bash
cd frontend
npm install
npm run dev
```

Frontend :

```txt
http://localhost:3000
```

### 4. ETL Python

```bash
cd etl
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
```

## Pipeline principal

Le pipeline se lance depuis :

```txt
/donnees → Lancer le pipeline de risque
```

Il exécute notamment :

```txt
CHIRPS latest
masquage normalisés
risque global
inondation
sécheresse
glissement
cyclone
métadonnées raster
cartes raster pour rapports
statistiques zonales
DWH
alertes validées
```

## Documentation

Voir :

```txt
docs/README.md
docs/risk-models-methodology.md
docs/raster-risk-pipeline.md
docs/dwh-star-schema.md
docs/solap-risk-cube.md
docs/data-sources.md
docs/deployment.md
docs/validation-checklist.md
docs/demo-script.md
docs/final-project-summary.md
```

## Données générées

Les fichiers lourds ne sont pas versionnés :

```txt
rasters .tif
archives .zip / .gz
GeoPackage
shapefiles
rapports générés
cartes PNG générées
uploads
.env
```

Ils doivent être régénérés via les pipelines ETL.

## État actuel

RISKCLIM-MG dispose aujourd'hui d'une V1 avancée :

```txt
multi-risques
raster
DWH
SOLAP
dashboard
rapports
alertes
temps réel météo
```

Les améliorations futures portent sur :

- SPI / SPEI pour la sécheresse ;
- flow accumulation pour l'inondation ;
- géologie / courbure pour les glissements ;
- sources cycloniques temps réel ;
- modèle global Aléa × Exposition × Vulnérabilité ;
- durcissement production.
