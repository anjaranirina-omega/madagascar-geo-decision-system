# Architecture du Projet — Système Géodécisionnel Spatial (Madagascar)

Architecture en **monorepo multi-services**, alignée sur le cahier des charges : Frontend React/Leaflet, Backend NestJS, ETL Python/GeoPandas, Data Warehouse spatial PostgreSQL/PostGIS, SOLAP (Pentaho/Superset), moteur AHP, alertes temps réel.

---

## 1. Vue d'ensemble (arborescence racine)

```
geodecisionnel-madagascar/
│
├── frontend/                      # Application Web React
├── backend/                       # API NestJS (métier + orchestration)
├── etl/                           # Pipelines ETL spatiaux (Python)
├── ahp-engine/                    # Moteur d'analyse multicritère AHP (Python, microservice)
├── data-warehouse/                # Scripts SQL du DWH spatial + schémas en étoile
├── bi/                            # Pentaho (SOLAP) + Apache Superset
├── infra/                         # Docker, Jenkins, Nginx, configs déploiement
├── docs/                          # Documentation, diagrammes, cahier des charges
├── scripts/                       # Scripts utilitaires (seed, backup, cron)
├── .github/workflows/             # CI/CD GitHub Actions (ou Jenkinsfile dans infra/)
├── docker-compose.yml
├── docker-compose.prod.yml
├── .env.example
├── .gitignore
└── README.md
```

---

## 2. Frontend — `frontend/` (React.js + Leaflet + MUI + Chart.js)

```
frontend/
├── public/
│   ├── favicon.ico
│   └── index.html
├── src/
│   ├── assets/                    # images, icônes, logos
│   ├── app/
│   │   ├── App.tsx
│   │   ├── routes.tsx             # routing global + guards par rôle
│   │   └── store.ts               # Redux/Zustand store global
│   │
│   ├── modules/
│   │   ├── auth/                  # connexion, déconnexion, gestion session
│   │   │   ├── pages/
│   │   │   ├── components/
│   │   │   └── auth.service.ts
│   │   │
│   │   ├── administration/        # gestion utilisateurs, rôles, permissions, API, poids AHP
│   │   │   ├── pages/
│   │   │   │   ├── UsersPage.tsx
│   │   │   │   ├── RolesPage.tsx
│   │   │   │   ├── ApiConfigPage.tsx
│   │   │   │   └── AhpWeightsPage.tsx
│   │   │   └── components/
│   │   │
│   │   ├── cartographie/          # Module SIG (Leaflet)
│   │   │   ├── components/
│   │   │   │   ├── MapView.tsx
│   │   │   │   ├── LayerControl.tsx      # couches climat/risque/vulnérabilité
│   │   │   │   ├── SpatialFilter.tsx
│   │   │   │   └── ZoneComparator.tsx
│   │   │   └── pages/CartePage.tsx
│   │   │
│   │   ├── dashboard/              # tableaux de bord décisionnels
│   │   │   ├── components/
│   │   │   │   ├── KpiCards.tsx
│   │   │   │   ├── RiskTrendChart.tsx     # Chart.js
│   │   │   │   ├── RiskDistributionChart.tsx
│   │   │   │   └── RegionalComparison.tsx
│   │   │   └── pages/DashboardPage.tsx
│   │   │
│   │   ├── analyse/                 # analyse multicritère AHP, historique, drill-down SOLAP
│   │   │   ├── pages/
│   │   │   │   ├── AnalyseMulticriterePage.tsx
│   │   │   │   ├── AnalyseHistoriquePage.tsx
│   │   │   │   └── SolapExplorerPage.tsx
│   │   │   └── components/
│   │   │
│   │   ├── alertes/                 # consultation & suivi des alertes
│   │   │   ├── pages/AlertesPage.tsx
│   │   │   └── components/AlertBadge.tsx
│   │   │
│   │   ├── rapports/                # génération de rapports (PDF/Excel)
│   │   │   └── pages/RapportsPage.tsx
│   │   │
│   │   └── terrain/                 # module agent de terrain
│   │       ├── pages/TerrainPage.tsx
│   │       └── components/FieldReportForm.tsx
│   │
│   ├── shared/
│   │   ├── components/              # boutons, tables, modals réutilisables
│   │   ├── hooks/
│   │   ├── layouts/                 # MainLayout, AuthLayout
│   │   └── guards/                  # RoleGuard, PrivateRoute
│   │
│   ├── services/
│   │   ├── api.ts                   # instance Axios/fetch + interceptors
│   │   ├── mapService.ts
│   │   ├── alertService.ts
│   │   └── websocket.ts             # connexion temps réel (alertes)
│   │
│   ├── types/                       # interfaces TypeScript (Risque, Vulnérabilité, Alerte...)
│   ├── utils/
│   ├── config/                      # variables d'environnement, constantes AHP
│   └── index.tsx
│
├── .env.example
├── package.json
├── tsconfig.json
└── Dockerfile
```

---

## 3. Backend — `backend/` (NestJS, architecture modulaire)

```
backend/
├── src/
│   ├── main.ts
│   ├── app.module.ts
│   │
│   ├── modules/
│   │   ├── auth/                    # JWT, rôles, permissions
│   │   │   ├── auth.module.ts
│   │   │   ├── auth.controller.ts
│   │   │   ├── auth.service.ts
│   │   │   ├── strategies/          # jwt.strategy.ts, local.strategy.ts
│   │   │   └── guards/              # roles.guard.ts, permissions.guard.ts
│   │   │
│   │   ├── users/                   # gestion utilisateurs & rôles (Admin)
│   │   │   ├── entities/user.entity.ts
│   │   │   ├── users.controller.ts
│   │   │   └── users.service.ts
│   │   │
│   │   ├── collecte/                # Module Collecte
│   │   │   ├── connectors/
│   │   │   │   ├── nasa-power.connector.ts
│   │   │   │   ├── openweather.connector.ts
│   │   │   │   ├── nasa-earthdata.connector.ts
│   │   │   │   └── copernicus.connector.ts
│   │   │   ├── scheduler/           # planification (cron) des collectes
│   │   │   ├── collecte.service.ts
│   │   │   └── collecte.controller.ts
│   │   │
│   │   ├── oltp/                    # Base opérationnelle (données brutes/historisées)
│   │   │   ├── entities/
│   │   │   │   ├── observation-climatique.entity.ts
│   │   │   │   ├── donnee-geographique.entity.ts
│   │   │   │   └── donnee-socio-eco.entity.ts
│   │   │   └── oltp.service.ts
│   │   │
│   │   ├── data-warehouse/          # alimentation DWH spatial (faits/dimensions)
│   │   │   ├── entities/
│   │   │   │   ├── fait-vulnerabilite.entity.ts
│   │   │   │   ├── dim-temps.entity.ts
│   │   │   │   ├── dim-localisation.entity.ts
│   │   │   │   └── dim-risque.entity.ts
│   │   │   ├── dwh.service.ts       # ETL → DWH (chargement)
│   │   │   └── dwh.controller.ts
│   │   │
│   │   ├── solap/                   # requêtes multidimensionnelles (drill-down/roll-up/slice/dice)
│   │   │   ├── solap.service.ts
│   │   │   └── solap.controller.ts
│   │   │
│   │   ├── analyse-multicritere/    # orchestration AHP (appel microservice ahp-engine)
│   │   │   ├── ahp.service.ts
│   │   │   ├── ahp.controller.ts
│   │   │   └── dto/criteria-weights.dto.ts
│   │   │
│   │   ├── risques/                 # indices de risque/vulnérabilité, zones critiques
│   │   │   ├── risques.service.ts
│   │   │   └── risques.controller.ts
│   │   │
│   │   ├── sig/                     # endpoints géospatiaux (PostGIS queries)
│   │   │   ├── sig.service.ts
│   │   │   └── sig.controller.ts
│   │   │
│   │   ├── dashboard/                # agrégation des indicateurs
│   │   │   ├── dashboard.service.ts
│   │   │   └── dashboard.controller.ts
│   │   │
│   │   ├── alertes/                  # détection, notification, historisation
│   │   │   ├── alertes.service.ts
│   │   │   ├── alertes.controller.ts
│   │   │   ├── alertes.gateway.ts    # WebSocket (temps réel)
│   │   │   └── notifications/
│   │   │       ├── email.notifier.ts
│   │   │       └── push.notifier.ts
│   │   │
│   │   ├── rapports/                 # génération de rapports PDF/Excel
│   │   │   └── rapports.service.ts
│   │   │
│   │   └── terrain/                  # remontées d'informations agents de terrain
│   │       ├── terrain.service.ts
│   │       └── terrain.controller.ts
│   │
│   ├── common/
│   │   ├── decorators/                # @Roles(), @CurrentUser()
│   │   ├── filters/                   # exception filters
│   │   ├── interceptors/              # logging, transform
│   │   ├── pipes/                     # validation
│   │   └── interfaces/
│   │
│   ├── config/
│   │   ├── database.config.ts
│   │   ├── postgis.config.ts
│   │   └── env.validation.ts
│   │
│   └── database/
│       ├── migrations/
│       └── seeds/
│
├── test/                             # tests unitaires & e2e
├── .env.example
├── package.json
├── tsconfig.json
└── Dockerfile
```

---

## 4. ETL Spatial — `etl/` (Python + Pandas + GeoPandas)

```
etl/
├── extract/
│   ├── extract_nasa_power.py
│   ├── extract_openweather.py
│   ├── extract_satellite.py          # NASA EarthData, Copernicus
│   └── extract_socio_eco.py
│
├── transform/
│   ├── clean_data.py                 # nettoyage, valeurs manquantes
│   ├── normalize_geometries.py       # reprojection, validation géométries (GeoPandas)
│   ├── compute_indicators.py         # agrégations intermédiaires
│   └── enrich_spatial_join.py        # jointures spatiales (région/district/commune)
│
├── load/
│   ├── load_to_oltp.py
│   └── load_to_dwh.py                # alimentation faits/dimensions
│
├── pipelines/
│   ├── pipeline_climatique.py        # orchestration extract→transform→load
│   ├── pipeline_satellite.py
│   └── pipeline_socio_eco.py
│
├── scheduler/
│   └── cron_jobs.py                  # ou intégration Airflow si besoin futur
│
├── validation/
│   └── data_quality_checks.py        # cohérence, doublons, valeurs aberrantes
│
├── logs/
├── requirements.txt
└── Dockerfile
```

---

## 5. Moteur AHP — `ahp-engine/` (microservice Python dédié à l'analyse multicritère)

```
ahp-engine/
├── app/
│   ├── main.py                       # API FastAPI/Flask exposée au backend NestJS
│   ├── ahp/
│   │   ├── pairwise_matrix.py        # matrices de comparaison par paires
│   │   ├── consistency_ratio.py      # calcul du ratio de cohérence
│   │   ├── weights_calculator.py     # calcul des poids par critère
│   │   └── risk_index_calculator.py  # indice de risque / vulnérabilité final
│   │
│   ├── criteria/
│   │   ├── climatic_criteria.py      # précipitations, température, humidité, vent
│   │   ├── geographic_criteria.py    # altitude, pente, proximité cours d'eau, occupation sol
│   │   └── socio_economic_criteria.py # densité pop, infra critiques, écoles, santé
│   │
│   └── models/
│       └── schemas.py
│
├── tests/
├── requirements.txt
└── Dockerfile
```

---

## 6. Data Warehouse Spatial — `data-warehouse/`

```
data-warehouse/
├── schema/
│   ├── 01_create_dim_temps.sql
│   ├── 02_create_dim_localisation.sql
│   ├── 03_create_dim_risque.sql
│   ├── 04_create_fait_vulnerabilite.sql
│   └── 05_create_indexes_postgis.sql
│
├── views/
│   └── vue_indicateurs_regionaux.sql
│
├── procedures/
│   └── proc_maj_indices.sql
│
└── README.md                         # schéma en étoile documenté
```

---

## 7. BI / Décisionnel — `bi/` (Pentaho SOLAP + Superset)

```
bi/
├── pentaho/
│   ├── jobs/                         # jobs .kjb (orchestration ETL)
│   ├── transformations/              # .ktr (transformations PDI)
│   └── cubes/                        # définitions cubes SOLAP (Mondrian/GeoMondrian)
│
└── superset/
    ├── dashboards/                   # exports JSON des dashboards
    ├── datasets/
    └── superset_config.py
```

---

## 8. Infrastructure — `infra/`

```
infra/
├── docker/
│   ├── postgres/
│   │   └── init-postgis.sql          # extension PostGIS à l'init
│   ├── nginx/
│   │   └── nginx.conf
│   └── superset/
│
├── jenkins/
│   └── Jenkinsfile
│
├── k8s/                              # (optionnel, si évolution vers Kubernetes)
│
└── env/
    ├── dev.env
    ├── staging.env
    └── prod.env
```

---

## 9. Documentation — `docs/`

```
docs/
├── cahier-des-charges.pdf
├── architecture/
│   ├── schema-architecture-fonctionnelle.png
│   ├── modele-decisionnel-etoile.png
│   └── diagramme-flux-donnees.png
├── api/
│   └── openapi.yaml                  # documentation Swagger de l'API NestJS
├── modele-donnees/
│   └── mcd-mld.pdf
└── guide-utilisateur/
    ├── guide-administrateur.md
    ├── guide-decideur.md
    ├── guide-analyste.md
    └── guide-agent-terrain.md
```

---

## 10. Docker Compose (services orchestrés)

```yaml
# docker-compose.yml (extrait conceptuel des services)
services:
  postgres-postgis:      # base OLTP + DWH, extension PostGIS
  backend:                # API NestJS
  frontend:                # App React (build servi via Nginx)
  etl:                      # conteneur Python (cron pipelines)
  ahp-engine:               # microservice FastAPI AHP
  superset:                 # BI / tableaux de bord
  pentaho:                  # jobs SOLAP (optionnel, ou exécuté en local/CI)
  nginx:                    # reverse proxy
```

---

## 11. Correspondance Cahier des Charges → Architecture

| Exigence du cahier des charges | Composant technique |
|---|---|
| Collecte auto API météo/satellite | `etl/extract/` + `backend/modules/collecte/` |
| Base opérationnelle OLTP | `backend/modules/oltp/` + PostgreSQL/PostGIS |
| Data Warehouse spatial | `data-warehouse/` + `backend/modules/data-warehouse/` |
| Cubes SOLAP | `bi/pentaho/cubes/` + `backend/modules/solap/` |
| Analyse multicritère AHP | `ahp-engine/` + `backend/modules/analyse-multicritere/` |
| Carte interactive / SIG | `frontend/modules/cartographie/` (Leaflet) + `backend/modules/sig/` |
| Tableaux de bord | `frontend/modules/dashboard/` + `bi/superset/` |
| Alertes temps réel | `backend/modules/alertes/` (WebSocket) + `frontend/modules/alertes/` |
| Gestion utilisateurs/rôles | `backend/modules/auth/` + `backend/modules/users/` |
| Rapports | `backend/modules/rapports/` + `frontend/modules/rapports/` |

---

## 12. Étapes recommandées pour démarrer dans VS Code

1. Créer le dossier racine `geodecisionnel-madagascar/` et y ouvrir VS Code.
2. Initialiser les sous-projets :
   - `npx create-react-app frontend --template typescript` (ou Vite pour plus de rapidité)
   - `nest new backend`
   - `python -m venv etl/venv` et `python -m venv ahp-engine/venv`
3. Ajouter les extensions VS Code utiles : ESLint, Prettier, Python, Docker, PostgreSQL (Explorer), GitLens, Thunder Client/REST Client.
4. Écrire `docker-compose.yml` pour lancer PostgreSQL/PostGIS + backend + frontend en local.
5. Mettre en place les migrations de `data-warehouse/schema/` avant de brancher l'ETL.
6. Développer le module `auth` en premier (base pour tous les rôles), puis `collecte` → `oltp` → `data-warehouse` → `solap`/`ahp` → `sig`/`dashboard` → `alertes`.
7. Initialiser Git + `.gitignore` (node_modules, venv, .env, dist/build) dès le départ.

---

*Cette structure suit une approche modulaire (Domain-Driven) permettant à chaque module métier du cahier des charges (Auth, Collecte, ETL, DWH, SOLAP, AHP, SIG, Dashboard, Alertes) d'évoluer indépendamment, tout en restant orchestré via Docker Compose pour un déploiement cohérent.*
