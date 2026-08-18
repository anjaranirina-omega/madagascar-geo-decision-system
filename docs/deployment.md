# Déploiement local — RISKCLIM-MG

## Prérequis

- Node.js
- npm
- Python 3
- PostgreSQL / PostGIS
- Docker
- GDAL
- Git

## Base de données

Lancer PostgreSQL/PostGIS :

```bash
docker compose up -d postgres-postgis
```

Vérifier :

```bash
docker ps
```

## Backend

```bash
cd backend
cp .env.example .env
npm install
npm run start:dev
```

API :

```txt
http://localhost:3001/api
```

Swagger :

```txt
http://localhost:3001/api/docs
```

## Frontend

```bash
cd frontend
npm install
npm run dev
```

Application :

```txt
http://localhost:3000
```

## ETL

```bash
cd etl
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
```

## Données locales

Les fichiers lourds sont générés localement et ignorés par Git :

```txt
etl/data/raster/
etl/data/geographie/*.gpkg
etl/data/cyclone/raw/*.csv
backend/uploads/
```

## Pipeline

Lancer depuis l'interface :

```txt
/donnees → Lancer le pipeline de risque
```

## Synchronisations optionnelles

NASA POWER :

```txt
/donnees → Synchroniser NASA POWER
```

OpenWeather régional :

```txt
POST /api/meteo/sync-regions
```

## Production

Pour une production réelle, il faudra renforcer :

- gestion des secrets ;
- stockage fichiers ;
- sauvegarde base ;
- HTTPS ;
- logs ;
- monitoring ;
- workers / queue pour jobs longs.
