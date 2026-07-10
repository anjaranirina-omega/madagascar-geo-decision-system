# Système Géodécisionnel Spatial — Madagascar

Monorepo multi-services pour la conception et la réalisation d'une plateforme géodécisionnelle en temps réel dédiée à l'analyse des risques et vulnérabilités climatiques à Madagascar.

## Modules principaux

- **frontend/** : React + TypeScript + Leaflet + Material UI + Chart.js
- **backend/** : NestJS API métier, sécurité, SIG, SOLAP, alertes et orchestration AHP
- **etl/** : pipelines Python/Pandas/GeoPandas pour extraction, transformation, validation et chargement
- **ahp-engine/** : microservice FastAPI pour l'analyse multicritère AHP
- **data-warehouse/** : scripts SQL PostgreSQL/PostGIS pour le Data Warehouse spatial
- **bi/** : Pentaho/Superset pour SOLAP et dashboards décisionnels
- **infra/** : Docker, Nginx, Jenkins, environnements

## Démarrage rapide

```bash
cp .env.example .env
docker compose up --build
```

Services prévus :

- Frontend : http://localhost:3000
- Backend API : http://localhost:3001/api
- AHP Engine : http://localhost:8000
- Superset : http://localhost:8088
- PostgreSQL/PostGIS : localhost:5432

## Ordre recommandé d'implémentation

1. Base Docker + PostgreSQL/PostGIS
2. Authentification et rôles
3. Modèle OLTP + collecte API météo/satellite
4. ETL spatial + Data Warehouse
5. Moteur AHP + calcul d'indices
6. API SIG + cartographie Leaflet
7. Dashboard + rapports
8. Alertes temps réel WebSocket
9. BI/SOLAP avec Superset/Pentaho
