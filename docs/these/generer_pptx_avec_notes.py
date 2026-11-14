#!/usr/bin/env python3
"""
Reconstruit le support de soutenance RISKCLIM-MG (v11) en PPTX,
en conservant le rendu exact de chaque diapositive (image pleine page)
et en y insérant les notes de l'orateur.

Source  : Soutenance_RISKCLIM-MG_v11.pdf (21 diapositives, 16:9)
Sortie  : Soutenance_RISKCLIM-MG_v11_notes.pptx
"""

from pathlib import Path

import pymupdf
from pptx import Presentation
from pptx.util import Inches

SOURCE = Path("/tmp/arena-coding-uploads/Soutenance_RISKCLIM-MG_v11.pdf")
OUTPUT = Path("/home/user/madagascar-geo-decision-system/docs/these/Soutenance_RISKCLIM-MG_v11_notes.pptx")
IMG_DIR = Path("/tmp/diapos_v11")

DPI = 200
SLIDE_W_IN = 13.333
SLIDE_H_IN = 7.5


NOTES = [
    # 1 ─ Silence
    """DURÉE : 5 s

« Mesdames et Messieurs, je vous remercie de bien vouloir éteindre vos téléphones. »

Rester debout, immobile. Ne pas parler en même temps que l'on change de diapositive.""",

    # 2 ─ Titre
    """DURÉE : 25 s

« Monsieur le Président, Madame et Messieurs les membres du jury,

J'ai l'honneur de vous présenter mon mémoire de fin d'études pour l'obtention du diplôme de Master professionnel, mention Informatique, parcours Ingénierie des Systèmes d'Information Intégrés.

Ce travail porte sur la conception et la réalisation d'un système géodécisionnel adossé à un entrepôt de données, pour l'analyse des risques climatiques à Madagascar. »

NE PAS relire le titre affiché. Regarder le jury, pas l'écran.""",

    # 3 ─ Remerciements
    """DURÉE : 30 s

« Avant de commencer, je tiens à exprimer ma gratitude au Président de l'Université de Fianarantsoa et au Directeur de l'École Nationale d'Informatique, pour la qualité de la formation reçue.

Je remercie tout particulièrement Monsieur le gérant d'ITDC Mada, société qui m'a accueillie, ainsi que mes deux encadreurs : Madame RAKOTOASIMBAHOAKA Antsa Cyprienna pour l'encadrement pédagogique, et Monsieur RAKOTOARISON Tsiorinantenaina pour l'encadrement professionnel.

Je remercie enfin les membres du jury pour l'attention portée à ce travail. »

Débit lent. Seul passage formel : le rythme compte plus que les mots.""",

    # 4 ─ Sommaire
    """DURÉE : 15 s

« Ma présentation s'organise en quatre temps : le cadre du projet, l'analyse et la conception, la réalisation technique, puis une démonstration du système en fonctionnement. »

NE PAS énumérer les sous-titres : ils sont affichés.""",

    # 5 ─ Section 01
    """DURÉE : 5 s

« Commençons par le cadre du projet. »""",

    # 6 ─ ENI
    """DURÉE : 20 s

« L'École Nationale d'Informatique, créée en 1983, forme aujourd'hui dans trois mentions : Informatique, Intelligence Artificielle et Expertise Digitale. Le parcours dont je suis issue est Ingénierie des Systèmes d'Information Intégrés. »

NE PAS détailler les cinq parcours ni les quatre dates : le jury connaît l'ENI.""",

    # 7 ─ ITDC Mada
    """DURÉE : 20 s

« J'ai effectué ce stage au sein d'ITDC Mada, société d'ingénierie logicielle et de géomatique implantée à Fianarantsoa, qui compte plus de vingt-cinq ingénieurs.

Sa démarche est Agile, avec des sprints de deux à trois semaines et une exigence constante sur le triptyque qualité, coût et délais. »""",

    # 8 ─ Contexte et problématique
    """DURÉE : 1 min 15 — DIAPOSITIVE LA PLUS IMPORTANTE DU DÉBUT
Marquer une pause après chaque limite.

« Madagascar est exposé à cinq types d'aléas : inondation, cyclone, sécheresse, glissement de terrain et vent violent. Le territoire compte 1 565 entités administratives : 22 régions, 110 districts et 1 433 communes.

Or, dans les organismes en charge de la gestion des risques, le traitement reste manuel et discontinu : les données sont consultées sur des sites distincts, retranscrites sous tableur, et les cartes produites sont statiques.

Trois limites en découlent, et elles constituent la problématique de ce travail.

Premièrement, les analyses croisées multicritères sont impossibles : les aléas physiques, la vulnérabilité humaine et l'occupation du sol ne sont jamais combinés dans un même calcul.

Deuxièmement, il n'existe aucune historisation spatio-temporelle : faute de référentiel unique, il est impossible de suivre l'évolution d'une tendance dans le temps.

Troisièmement, la diffusion des alertes manque de réactivité : l'évaluation manuelle retarde la décision et l'information des autorités. »""",

    # 9 ─ Objectifs et périmètre
    """DURÉE : 1 min

« L'objectif général est de concevoir et réaliser un système géodécisionnel adossé à un entrepôt de données spatiales pour l'analyse des risques climatiques à Madagascar.

Quatre résultats sont attendus : un pipeline ETL automatisé qui harmonise des flux hétérogènes en WGS 84 ; un entrepôt de données spatiales sous PostgreSQL et PostGIS, organisé en constellation ; un moteur multicritère AHP avec contrôle de cohérence, dont le ratio doit rester inférieur à 10 % ; et une plateforme SOLAP interactive, avec alertes et rapports.

Le périmètre couvre la cartographie interactive, la pondération AHP, les alertes par WebSocket et par courriel, les rapports PDF, Excel et CSV, et trois profils : administrateur, analyste et décideur. »""",

    # 10 ─ Section 02
    """DURÉE : 5 s

« Passons à l'analyse et à la conception. »""",

    # 11 ─ Méthodologie et outils
    """DURÉE : 1 min

« La conception s'est déroulée en cinq étapes, conformément à la démarche de Kimball et Ross.

J'ai d'abord recensé les données : contenu de l'entrepôt, sources, axes d'analyse, mesures de fait et granularité. J'ai ensuite établi un dictionnaire de données décrivant chaque attribut. Puis j'ai formalisé les règles de gestion, d'intégrité spatio-temporelle et les règles métier. Vient ensuite la modélisation dimensionnelle, aux niveaux conceptuel puis logique. Enfin l'alimentation de l'entrepôt par les pipelines ETL.

Les outils de conception sont dbdiagram.io pour les schémas, PostgreSQL 16 pour le SGBD, et PostGIS 3.4 pour les géométries et les index spatiaux GiST. »""",

    # 12 ─ Analyse de l'existant
    """DURÉE : 50 s

« L'analyse de l'existant, menée auprès du BNGRC, de la Direction Générale de la Météorologie et du CPGU, montre un processus en trois temps : une acquisition disparate depuis plusieurs sites, un traitement manuel sous tableur avec des cartes statiques produites sous QGIS, puis une diffusion des alertes par courriel, télécopie ou radio.

Quatre limites en résultent : l'absence d'entrepôt, les données restant dispersées sur des postes individuels ; une évaluation subjective, faute de modèle multicritère ; des cartes statiques en PDF ou JPEG, sans navigation multi-échelles ; et des délais de diffusion élevés, sans automatisation. »""",

    # 13 ─ Proposition de solutions
    """DURÉE : 1 min 05

« Trois solutions ont été examinées.

La première, un logiciel libre de type QGIS Server ou GeoNode, présente l'avantage de la gratuité et du respect des standards OGC. Elle a été écartée : elle n'offre ni entrepôt, ni cube SOLAP, ni moteur AHP intégré, ni alertes temps réel.

La deuxième, ArcGIS Enterprise, est techniquement éprouvée, mais sa licence coûte entre 18 000 et 25 000 dollars par an, pour un éditeur propriétaire dont la personnalisation AHP est complexe. Elle a été écartée pour son coût récurrent.

La troisième, retenue, est un système géodécisionnel sur mesure, entièrement open source. Son atout est l'adéquation exacte aux besoins : ETL automatisé, moteur AHP, alertes temps réel, indépendance technologique. Sa limite est assumée : un investissement initial important. »

NE PAS s'excuser du choix. La limite est sur la diapositive : la reconnaître est un signe de maîtrise.""",

    # 14 ─ Architecture fonctionnelle
    """DURÉE : 50 s

« L'architecture fonctionnelle s'organise en cinq maillons.

Les données : sources satellitaires, météorologiques et administratives, dont CHIRPS, WorldPop et GADM. L'ETL, qui extrait, harmonise en WGS 84, normalise et charge. L'entrepôt spatial, en constellation sous PostgreSQL et PostGIS, alimenté par les statistiques zonales. L'analyse : modèles de risque, AHP, et cube SOLAP avec les opérations de forage, d'agrégation, de tranchage et de découpage. Enfin la décision : carte, tableau de bord, alertes et rapports.

Chaque traitement raster est tracé dans l'entrepôt, dans la table FACT_RASTER_PROCESSING, et l'historique des indicateurs est conservé. »""",

    # 15 ─ Schéma en constellation
    """DURÉE : 50 s
QUESTION QUASI CERTAINE : « pourquoi une constellation et non une étoile ? »
La réponse est dans la dernière phrase : la donner d'emblée.

« Le modèle de données adopte un schéma en constellation : trois tables de faits partagent quatre dimensions.

Les tables de faits sont FACT_RISK_INDICATOR, qui porte les indicateurs de risque ; FACT_CLIMATE_OBSERVATION, qui porte les observations climatiques ; et FACT_RASTER_PROCESSING, qui assure la traçabilité des traitements.

Les dimensions communes sont DIM_ZONE, avec les 1 565 entités administratives ; DIM_TIME, la dimension temporelle ; DIM_RISK_TYPE, les cinq typologies d'aléas ; et DIM_DATA_SOURCE, les huit sources.

Le choix de la constellation plutôt que de l'étoile tient à ce que les trois tables de faits partagent effectivement les mêmes axes d'analyse : c'est la condition posée par Kimball. »""",

    # 16 ─ Section 03
    """DURÉE : 5 s

« Passons à la réalisation. »""",

    # 17 ─ Architecture technique
    """DURÉE : 45 s

« L'architecture technique se lit en quatre couches.

L'ingestion repose sur Python, avec Rasterio, GeoPandas et NumPy pour les pipelines ETL. L'entrepôt et le stockage associent PostgreSQL 16, PostGIS 3.4, le schéma dwh et MinIO pour le stockage objet. La couche métier combine un microservice FastAPI dédié au calcul AHP et une API NestJS avec REST, JWT et WebSocket. La restitution est une application monopage en React, avec Leaflet pour la cartographie et Tailwind CSS pour les styles. »""",

    # 18 ─ Outils de réalisation
    """DURÉE : 30 s — ALLER VITE, cette diapositive ne demande pas de commentaire

« Les outils retenus couvrent toute la chaîne : dbdiagram.io pour la modélisation, PostgreSQL et PostGIS pour le stockage spatial, Python pour l'ETL, MinIO pour les rapports, Docker pour la conteneurisation, FastAPI et NestJS côté serveur, React, Vite et Leaflet côté client, et Git avec GitHub pour la gestion de versions. »""",

    # 19 ─ Démonstration
    """DURÉE : 5 min

AVANT DE COMMENCER : backend, frontend et Docker démarrés. Navigateur sur http://localhost:3000, zoom 110 %, notifications système coupées.

0:00  ACCUEIL
« Voici la page d'accueil de RISKCLIM-MG. J'accède à la plateforme. »

0:15  CONNEXION
« Je m'authentifie en tant qu'administrateur : le contrôle des rôles est actif. »

0:30  TABLEAU DE BORD (2 minutes)
« Le tableau de bord est le point d'entrée opérationnel. Il présente six indicateurs.

L'indice national de risque, moyenné et pondéré par AHP. La population exposée estimée, issue du croisement du raster WorldPop avec les aléas : 27,63 millions d'habitants. Les zones à surveiller, c'est-à-dire les couples zone-aléa dont le score dépasse 80 sur 100. Le point chaud territorial. Les couches raster chargées dans l'entrepôt, au nombre de 19. Et l'état des flux de données : 7 sources connectées sur 8.

Ce dernier indicateur mérite un mot. La huitième source, CHIRPS, a échoué lors de sa dernière synchronisation : le serveur de l'Université de Californie a refusé la connexion. Les précipitations exploitées sont donc celles du dernier téléchargement réussi, le 24 septembre. La plateforme détecte cette indisponibilité et la signale, plutôt que d'utiliser silencieusement des données périmées.

En dessous, le filtrage SOLAP permet de choisir l'aléa et la maille administrative. La distribution des niveaux de risque s'appuie sur 110 entités région-aléa. Et le graphique présente la rétrospective temporelle issue de l'entrepôt. »

ANTICIPER SOI-MÊME LE 7/8 : le jury le verra de toute façon.

2:30  CARTE DES RISQUES
« La carte restitue les 22 régions, 110 districts et 1 433 communes, avec coloration choroplèthe et superposition des dalles raster. »

3:10  ANALYSES & DÉCISION
« Le module AHP affiche la matrice de comparaison par paires. Le modèle inondation retient 50 % pour les précipitations et 25 % pour chacun des deux autres critères. La cohérence est vérifiée : la valeur propre maximale vaut 3, l'indice de cohérence est nul, et le ratio vaut 0,00 %, très en dessous du seuil de 10 %. »

4:20  ALERTES
« 29 alertes enregistrées, dont 26 actives, 1 critique et 3 résolues. Chaque ligne porte la population exposée de sa zone, issue du croisement WorldPop. »

4:50  RAPPORTS
« Les rapports sont générés en PDF, Excel et CSV. »

NE JAMAIS CLIQUER SUR :
- « Lancer le pipeline de risque » (bloqué par CHIRPS, gèle l'écran)
- « Démo » à côté des cyclones GDACS (crée des alertes fictives)
- « Vérifier alertes » (génère des alertes hors signaux)""",

    # 20 ─ Conclusion et perspectives
    """DURÉE : 1 min

« Pour conclure, ce travail a produit un système complet, de la collecte à la décision.

Cinq modèles de risque opérationnels couvrent les 1 565 zones administratives. L'entrepôt spatial est interrogeable en SOLAP : il contient 39 125 faits d'indicateurs, répartis sur plusieurs périodes d'observation, ce qui matérialise la profondeur temporelle du cube. La plateforme génère des alertes et des rapports dans quatre formats.

Cinq perspectives prolongent ce travail : l'intégration de l'indice standardisé de précipitation sur trente ans pour affiner le modèle sécheresse ; l'apprentissage automatique pour la prévision hydrologique ; le radar Sentinel-1 pour le suivi des inondations ; la parallélisation des calculs raster à haute résolution ; et une application mobile de collecte participative. »

NE PAS lire les cinq perspectives mot à mot : citer les trois premières, évoquer les deux dernières d'un geste vers l'écran.""",

    # 21 ─ Merci
    """DURÉE : 10 s

« Je vous remercie de votre attention, et je me tiens à votre disposition pour répondre à vos questions. »

S'ARRÊTER NET. Ne rien ajouter, ne pas s'excuser.""",
]


def main() -> None:
    doc = pymupdf.open(SOURCE)
    if len(doc) != len(NOTES):
        raise SystemExit(
            f"Incohérence : {len(doc)} diapositives dans le PDF, {len(NOTES)} notes fournies."
        )

    IMG_DIR.mkdir(parents=True, exist_ok=True)
    zoom = DPI / 72.0
    matrix = pymupdf.Matrix(zoom, zoom)

    prs = Presentation()
    prs.slide_width = Inches(SLIDE_W_IN)
    prs.slide_height = Inches(SLIDE_H_IN)
    blank = prs.slide_layouts[6]

    for index, page in enumerate(doc, start=1):
        image_path = IMG_DIR / f"diapo_{index:02d}.png"
        pix = page.get_pixmap(matrix=matrix, alpha=False)
        pix.save(image_path)

        slide = prs.slides.add_slide(blank)
        slide.shapes.add_picture(
            str(image_path), 0, 0, width=prs.slide_width, height=prs.slide_height
        )

        notes_frame = slide.notes_slide.notes_text_frame
        notes_frame.text = NOTES[index - 1]

    prs.save(OUTPUT)
    print(f"OK -> {OUTPUT}")
    print(f"{len(prs.slides.__iter__.__self__._sldIdLst)} diapositives, notes insérées.")


if __name__ == "__main__":
    main()
