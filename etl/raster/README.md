# Pipeline Raster — Analyse des risques climatiques

Ce dossier contient les scripts ETL raster utilisés pour préparer les couches d’analyse spatiale du système RISKCLIM-MG.

Le pipeline raster permet de transformer des données géographiques continues en grilles spatiales exploitables pour le calcul d’un indice de risque climatique.

---

## Pourquoi le raster ?

Les phénomènes climatiques et environnementaux sont continus dans l’espace. Ils sont donc mieux représentés par des grilles raster que par des objets vectoriels.

Exemples de couches raster utilisées ou prévues :

- précipitations ;
- température ;
- altitude ;
- pente ;
- densité de population ;
- occupation du sol ;
- proximité hydrographique ;
- indice de vulnérabilité ;
- indice de risque final.

Dans ce projet :

- les rasters servent au calcul du risque ;
- les données vectorielles servent au découpage administratif, à l’agrégation, au filtrage et à l’affichage.

---

## Pipeline général

Couches raster sources
↓
Téléchargement / acquisition
↓
Prétraitement
↓
Reprojection / alignement spatial
↓
Normalisation 0 → 1
↓
Pondération des critères
↓
Overlay pondéré
↓
Raster final d’indice de risque
↓
Classification faible / moyen / élevé / critique
↓
Affichage web cartographique

---

## Structure des dossiers

etl/
├── raster/
│   ├── generate_demo_rasters.py
│   ├── weighted_overlay.py
│   ├── raster_metadata.py
│   ├── mask_rasters_to_madagascar.py
│   └── dem/
│       ├── download_dem_opentopography.py
│       ├── validate_dem_tiles.py
│       ├── check_dem_download_progress.py
│       ├── build_dem_vrt.py
│       ├── reproject_dem_vrt.py
│       ├── compute_slope_gdal.py
│       ├── normalize_slope.py
│       └── README.md
│
└── data/
    └── raster/
        ├── raw/
        ├── processed/
        ├── normalized/
        └── risk/

---

## Sources actuellement intégrées

### Copernicus DEM GLO-30

La couche topographique réelle utilisée est :
Copernicus DEM GLO-30

Elle est téléchargée via l’API OpenTopography avec le type :
COP30

Cette source sert à produire :
dem_madagascar_metric.tif
slope_metric.tif
slope_norm.tif

La pente dérivée du DEM remplace la pente simulée du pipeline de démonstration.

---

## Sources encore prévues

Les autres couches restent actuellement des couches de démonstration ou doivent être remplacées progressivement par des sources réelles :

- CHIRPS pour les précipitations ;
- WorldPop pour la densité de population ;
- ESA WorldCover pour l’occupation du sol ;
- HydroSHEDS / JRC Global Surface Water pour l’hydrographie et l’inondation ;
- NASA POWER pour les indicateurs climatiques temporels ;
- Copernicus / ERA5 pour des variables climatiques avancées.

---

## Scripts principaux

### generate_demo_rasters.py

Génère des rasters normalisés de démonstration entre 0 et 1 :
rainfall_norm.tif
population_norm.tif
landcover_norm.tif
slope_norm.tif

Remarque : slope_norm.tif est ensuite remplacé par une vraie pente dérivée du Copernicus DEM GLO-30.

---

### weighted_overlay.py

Combine les couches raster normalisées avec des poids.

Poids actuels :
rainfall   : 0.35
slope      : 0.25
population : 0.25
landcover  : 0.15

Formule :
risk = 0.35 × rainfall_norm + 0.25 × slope_norm + 0.25 × population_norm + 0.15 × landcover_norm

Produit :
risk_index.tif
risk_classified.tif

---

### mask_rasters_to_madagascar.py

Applique un masque spatial basé sur la limite nationale de Madagascar.

Le masque utilise :
etl/data/geographie/gadm41_MDG.gpkg
ADM_ADM_0

Il permet de transformer les pixels hors Madagascar en NoData.

Cela évite d’afficher un rectangle raster sur l’océan dans la carte Leaflet.

---

### raster_metadata.py

Affiche les métadonnées des rasters utiles à l’application.

Ce script calcule les statistiques par blocs afin d’éviter une forte consommation mémoire.

Rasters analysés :
etl/data/raster/normalized/*.tif
etl/data/raster/risk/*.tif

Les gros fichiers intermédiaires DEM ne sont pas scannés par défaut pour éviter les erreurs mémoire.

---

## Pipeline Copernicus DEM GLO-30

### 1. Télécharger les tuiles DEM

python raster/dem/download_dem_opentopography.py

Ce script télécharge les tuiles Copernicus DEM via OpenTopography.

Variables nécessaires dans .env :
OPENTOPOGRAPHY_API_KEY=your_api_key
OPENTOPOGRAPHY_DEM_TYPE=COP30
DEM_TILE_SIZE_DEGREES=1.0

Le script gère :
- les tuiles déjà téléchargées ;
- les tuiles sans contenu OpenTopography ;
- les limites d’API ;
- la reprise du téléchargement.

---

### 2. Valider les tuiles

python raster/dem/validate_dem_tiles.py

Ce script vérifie que les tuiles GeoTIFF sont lisibles et supprime les fichiers invalides.

---

### 3. Vérifier la progression du téléchargement

python raster/dem/check_dem_download_progress.py

Il affiche :
Tuiles attendues
Tuiles présentes
Tuiles ignorées
Tuiles manquantes

---

### 4. Construire un VRT

python raster/dem/build_dem_vrt.py

Le VRT permet de référencer les tuiles sans charger toute la mosaïque en mémoire.

Cette approche est plus robuste que rasterio.merge pour des rasters volumineux.

---

### 5. Reprojeter le DEM

python raster/dem/reproject_dem_vrt.py

Le DEM est reprojeté en CRS métrique :
EPSG:3857

Sortie :
etl/data/raster/processed/dem/dem_madagascar_metric.tif

---

### 6. Calculer la pente

python raster/dem/compute_slope_gdal.py

La pente est calculée avec GDAL.

Sortie :
etl/data/raster/processed/dem/slope_metric.tif

---

### 7. Normaliser la pente

python raster/dem/normalize_slope.py

La pente est normalisée entre 0 et 1 et alignée sur la grille raster de référence.

Sortie :
etl/data/raster/normalized/slope_norm.tif

---

## Masquage et recalcul du risque

Après avoir produit slope_norm.tif, exécuter :

python raster/mask_rasters_to_madagascar.py --scope normalized
python raster/weighted_overlay.py
python raster/mask_rasters_to_madagascar.py --scope risk
python raster/raster_metadata.py

Ordre important :
1. masquer les couches normalisées ;
2. recalculer le risque ;
3. masquer les rasters de risque finaux ;
4. vérifier les métadonnées.

---

## Enregistrement des métadonnées backend

Quand le backend est lancé :
cd ../backend
npm run start:dev

Depuis le dossier etl :
python raster/register_raster_metadata.py

Ce script enregistre les métadonnées dans le backend via :
POST /api/rasters/register

Le backend expose ensuite :
GET /api/rasters
GET /api/rasters/latest/risk
GET /api/rasters/latest/risk/file

---

## Affichage frontend

Le frontend Leaflet charge le raster via :
GET /api/rasters/latest/risk/file

Puis l’affiche sur la carte des risques.

La légende utilisée est :
Faible    : 0–30
Moyen     : 31–60
Élevé     : 61–80
Critique  : 81–100

---

## Classes de risque

Le raster risk_classified.tif utilise les classes suivantes :
1 = Faible    0–30
2 = Moyen     31–60
3 = Élevé     61–80
4 = Critique  81–100

---

## Exécution complète recommandée

Depuis la racine du projet :
cd etl
source .venv/bin/activate

### Si les rasters de démonstration n’existent pas encore
python raster/generate_demo_rasters.py

### Pour intégrer Copernicus DEM GLO-30
python raster/dem/download_dem_opentopography.py
python raster/dem/validate_dem_tiles.py
python raster/dem/check_dem_download_progress.py
python raster/dem/build_dem_vrt.py
python raster/dem/reproject_dem_vrt.py
python raster/dem/compute_slope_gdal.py
python raster/dem/normalize_slope.py

### Pour recalculer le risque
python raster/mask_rasters_to_madagascar.py --scope normalized
python raster/weighted_overlay.py
python raster/mask_rasters_to_madagascar.py --scope risk
python raster/raster_metadata.py

### Pour enregistrer les métadonnées
python raster/register_raster_metadata.py

---

## Remarques importantes

Les rasters générés ne sont pas versionnés dans Git.

Ils sont ignorés via .gitignore :
*.tif
*.tiff
*.vrt
*.aux.xml

Les scripts sont versionnés, mais les données raster doivent être régénérées localement ou téléchargées depuis leurs sources.

---

## Limites actuelles

Le pipeline utilise déjà une vraie source topographique :
Copernicus DEM GLO-30

Cependant, certaines couches restent encore à remplacer par des sources réelles :
rainfall_norm.tif   -> CHIRPS
population_norm.tif -> WorldPop
landcover_norm.tif  -> ESA WorldCover

---

## Prochaines améliorations

Les prochaines étapes recommandées sont :
1. intégrer CHIRPS rainfall ;
2. intégrer WorldPop ;
3. intégrer ESA WorldCover ;
4. intégrer HydroSHEDS ou JRC Global Surface Water ;
5. connecter les poids AHP dynamiques ;
6. calculer des indices de risque par type d’aléa ;
7. agréger les résultats par région, district et commune.

## Intégration CHIRPS rainfall

La couche `rainfall_norm.tif` peut désormais être produite à partir d’une vraie source climatique raster : CHIRPS.

Commandes :

```bash
python raster/chirps/download_chirps.py
python raster/chirps/process_chirps.py
python raster/chirps/normalize_chirps.py

Cette couche remplace la pluie simulée dans le calcul du raster de risque.
