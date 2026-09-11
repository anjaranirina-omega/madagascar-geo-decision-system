# Data Warehouse Spatial (DWH / SOLAP)

Système d'aide à la décision géospatiale et entrepôt de données multidimensionnel pour l'analyse des risques climatiques à Madagascar.

---

## 🏛️ 1. Architecture du Schéma en Étoile (*Star Schema*)

L'entrepôt est structuré sous le schéma PostgreSQL `dwh` :

```text
                             ┌────────────────────────┐
                             │      dwh.dim_time      │
                             │ (Jour, Mois, Trimestre)│
                             └───────────┬────────────┘
                                         │
┌────────────────────────┐               │               ┌────────────────────────┐
│      dwh.dim_zone      │               │               │   dwh.dim_risk_type    │
│ (22 Régions, 110 Dist, ├───────────────┼───────────────┤ (GLOBAL, FLOOD, DROUGHT│
│  1433 Communes PostGIS)│               │               │  CYCLONE, LANDSLIDE)   │
└────────────────────────┘               │               └────────────────────────┘
                                         ▼
                     ┌─────────────────────────────────────────┐
                     │        dwh.fact_risk_indicator          │
                     │  • risk_mean, risk_max, hazard_mean     │
                     │  • population_exposed (WorldPop)        │
                     │  • area_km2, risk_level, raster_id      │
                     └─────────────────────────────────────────┘
                                         ▲
┌────────────────────────┐               │               ┌────────────────────────┐
│   dwh.dim_data_source  ├───────────────┴───────────────┤   dwh.fact_climate_obs │
│ (CHIRPS, NASA, GDACS,  │                               │ (T°, Pluie, Vents,     │
│  Copernicus DEM)       │                               │  Humidité journalière) │
└────────────────────────┘                               └────────────────────────┘
```

---

## 📐 2. Dimensions

- **`dwh.dim_time`** : Clé temporelle entière `YYYYMMDD`, avec attributs `year`, `quarter`, `month`, `month_name`, `day`, `week`, `day_of_week`, `is_weekend`.
- **`dwh.dim_zone`** : Découpage administratif hiérarchique avec géométries PostGIS `MultiPolygon` indexées GiST (`region`, `district`, `commune`).
- **`dwh.dim_risk_type`** : Nomenclature des modèles de risque (`GLOBAL`, `FLOOD`, `DROUGHT`, `CYCLONE`, `LANDSLIDE`).
- **`dwh.dim_data_source`** : Métadonnées et traçabilité des flux satellitaires et météorologiques.

---

## 📊 3. Tables de Faits

- **`dwh.fact_risk_indicator`** : Granularité spatiotemporelle fine consolidant les statistiques zonales issues des GeoTIFFs calculés par l'ETL et les données d'exposition humaine.
- **`dwh.fact_climate_observation`** : Historique des mesures climatiques quotidiennes par zone.
- **`dwh.fact_raster_processing`** : Traçabilité des versions et métriques des couches matricielles produites.

---

## ⚡ 4. Vues Matérialisées & Performance SOLAP

- **`dwh.mv_regional_risk_summary`** : Vue matérialisée pré-agrégée au niveau régional pour accélérer le chargement des tableaux de bord et des analyses décisionnelles en temps constant.
- **Index composites dédiés** :
  - `idx_fact_risk_indicator_solap_query` : Optimisé pour le tri par sévérité `risk_max` et filtrage par type d'aléa / date.
  - `idx_dim_zone_lookup` : Accélération des opérations de *Drill-Down* et *Roll-Up* spatial.
  - `idx_dim_zone_geom` : Index spatial GiST pour les jointures géographiques `ST_Intersects` et `ST_Contains`.

---

## 🔄 5. Alimentation & Actualisation

Le rafraîchissement est orchestré automatiquement :
1. Via le planificateur ETL : `python scheduler/cron_jobs.py` (ou `python dwh/build_risk_star_schema.py`).
2. Via le module d'alimentation : `python load/load_to_dwh.py`.
