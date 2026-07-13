# Données géographiques Madagascar

Ce dossier est destiné aux fichiers SIG utilisés pour l'import géographique.

## Source utilisée
GADM Madagascar, version 4.1.

Fichier attendu localement :
gadm41_MDG.gpkg

Téléchargement :
wget -O etl/data/geographie/gadm41_MDG.gpkg https://geodata.ucdavis.edu/gadm/gadm4.1/gpkg/gadm41_MDG.gpkg

## Mapping GADM utilisé
Dans le fichier GADM Madagascar 4.1 :
ADM_ADM_1 -> anciennes provinces
ADM_ADM_2 -> régions
ADM_ADM_3 -> districts
ADM_ADM_4 -> communes

Le script importe :
ADM_ADM_2 -> table regions
ADM_ADM_3 -> table districts
ADM_ADM_4 -> table communes

## Volumétrie importée
Avec GADM 4.1, l'import actuel donne :
22 régions
110 districts
1433 communes

## Import dans PostgreSQL/PostGIS
Depuis le dossier etl :
cd etl
source .venv/bin/activate

DATABASE_URL="postgresql://geodecisionnel:geodecisionnel@localhost:5433/geodecisionnel" \
python load/load_geographie_gadm.py
