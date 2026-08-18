# Checklist de validation — RISKCLIM-MG

## 1. Vérification Git

```bash
git status
```

Vérifier qu'aucun fichier lourd n'est suivi :

```bash
git ls-tree -r --name-only HEAD | grep -E '\.(tif|tiff|vrt|zip|gz|shp|dbf|shx|gpkg|geojson|csv)$'
```

## 2. Backend

```bash
cd backend
npm run build
```

## 3. Frontend

```bash
cd frontend
npm run build
```

## 4. ETL Python

```bash
cd etl
source .venv/bin/activate
python -m py_compile raster/weighted_overlay.py
python -m py_compile raster/register_raster_metadata.py
```

## 5. API principales

```bash
curl http://localhost:3001/api/rasters/latest/RISK_INDEX
curl http://localhost:3001/api/rasters/latest/FLOOD_RISK_INDEX
curl http://localhost:3001/api/rasters/latest/DROUGHT_RISK_INDEX
curl http://localhost:3001/api/rasters/latest/LANDSLIDE_RISK_INDEX
curl http://localhost:3001/api/rasters/latest/CYCLONE_RISK_INDEX
```

## 6. Météo

```bash
curl "http://localhost:3001/api/meteo/current?lat=-18.8792&lng=47.5079"
curl "http://localhost:3001/api/meteo/latest-by-zone?zoneType=region"
```

## 7. DWH

```bash
PGPASSWORD=geodecisionnel psql -h localhost -p 5433 -U geodecisionnel -d geodecisionnel -c "
SELECT r.risk_type, z.zone_type, COUNT(*)
FROM dwh.fact_risk_indicator f
JOIN dwh.dim_risk_type r ON r.risk_type_key = f.risk_type_key
JOIN dwh.dim_zone z ON z.zone_key = f.zone_key
GROUP BY r.risk_type, z.zone_type
ORDER BY r.risk_type, z.zone_type;
"
```

## 8. Pages frontend à vérifier

- `/`
- `/carte`
- `/analyse`
- `/donnees`
- `/alertes`
- `/rapports`
- `/utilisateurs`

## 9. Pipeline complet

Depuis `/donnees` :

```txt
Lancer le pipeline de risque
```

Vérifier :

```txt
job SUCCESS
rasters mis à jour
DWH reconstruit
alertes validées
cartes rapports générées
```

## 10. Rapports

Depuis `/rapports` :

- générer PDF national ;
- générer Excel national ;
- vérifier historique ;
- tester téléchargement historique ;
- tester suppression.
