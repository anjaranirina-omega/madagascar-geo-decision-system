# Script oral de soutenance — RISKCLIM-MG

**Support :** `Soutenance_RISKCLIM-MG_v11.pdf` — 21 diapositives
**Durée cible :** 18 minutes, démonstration de 6 minutes comprise
**Chiffres de référence :** relevés le 4 novembre 2026 sur la base courante

---

## 1. Répartition du temps

| Diapos | Contenu | Durée |
|---|---|---|
| 1 – 4 | Ouverture, remerciements, sommaire | 1 min 30 |
| 5 – 9 | Présentation : ENI, ITDC, contexte, objectifs | 4 min 15 |
| 10 – 15 | Analyse et conception | 5 min 45 |
| 16 – 18 | Réalisation | 2 min 30 |
| 19 | **Démonstration** | 6 min |
| 20 – 21 | Conclusion, remerciements | 1 min 30 |
| | **Total** | **21 min 30** |

**Pour tenir 18 minutes :** réduire la présentation de l'ENI et d'ITDC à 30 secondes chacune, et la démonstration à 5 minutes. Ne jamais réduire l'analyse de l'existant ni la conclusion.

---

## 2. Script diapo par diapo

### Diapo 1 — Silence et téléphones (5 s)

> « Mesdames et Messieurs, je vous remercie de bien vouloir éteindre vos téléphones. »

---

### Diapo 2 — Titre (30 s)

> « Monsieur le Président, Madame et Messieurs les membres du jury,
>
> J'ai l'honneur de vous présenter mon mémoire de fin d'études pour l'obtention du diplôme de Master professionnel, mention Informatique, parcours Ingénierie des Systèmes d'Information Intégrés.
>
> Ce travail porte sur la conception et la réalisation d'un système géodécisionnel adossé à un entrepôt de données, pour l'analyse des risques climatiques à Madagascar. »

**Ne pas dire** le titre en entier une seconde fois : il est écrit.

---

### Diapo 3 — Remerciements (40 s)

> « Avant de commencer, je tiens à exprimer ma gratitude au Président de l'Université de Fianarantsoa et au Directeur de l'École Nationale d'Informatique, pour la qualité de la formation reçue.
>
> Je remercie tout particulièrement Monsieur le gérant d'ITDC Mada, société qui m'a accueillie, ainsi que mes deux encadreurs, Madame RAKOTOASIMBAHOAKA Antsa Cyprienna pour l'encadrement pédagogique et Monsieur RAKOTOARISON Tsiorinantenaina pour l'encadrement professionnel.
>
> Je remercie enfin les membres du jury pour l'attention portée à ce travail. »

**Débit lent.** C'est le seul passage purement formel : le rythme y compte plus que les mots.

---

### Diapo 4 — Sommaire (20 s)

> « Ma présentation s'organise en quatre temps : la présentation du cadre institutionnel et du projet, l'analyse et la conception, la réalisation technique, puis une démonstration du système en fonctionnement. »

**Ne pas** énumérer les quatre titres : ils sont affichés.

---

### Diapo 5 — Section (5 s)

Aucune parole, ou simplement : « Commençons par le cadre du projet. »

---

### Diapo 6 — L'ENI (30 s)

> « L'École Nationale d'Informatique, créée en 1983, forme aujourd'hui des étudiants dans trois mentions : Informatique, Intelligence Artificielle et Expertise Digitale. Le parcours dont je suis issue est Ingénierie des Systèmes d'Information Intégrés. »

**Ne pas** détailler les cinq parcours : le jury connaît l'ENI.

---

### Diapo 7 — ITDC Mada (30 s)

> « J'ai effectué ce stage au sein d'ITDC Mada, société d'ingénierie logicielle et de géomatique implantée à Fianarantsoa, qui compte plus de vingt-cinq ingénieurs.
>
> La démarche de l'entreprise est Agile, avec des sprints de deux à trois semaines, et une exigence constante sur le triptyque qualité, coût et délais. »

---

### Diapo 8 — Contexte et problématique (1 min 30)

> « Madagascar est exposé à cinq types d'aléas : inondation, cyclone, sécheresse, glissement de terrain et vent violent. Le territoire compte 1 565 entités administratives : 22 régions, 110 districts et 1 433 communes.
>
> Or, dans les organismes en charge de la gestion des risques, le traitement reste aujourd'hui manuel et discontinu : les données sont consultées sur des sites distincts, retranscrites sous tableur, et les cartes produites sont statiques.
>
> Trois limites en découlent, et elles constituent la problématique de ce travail.
>
> Premièrement, les analyses croisées multicritères sont impossibles : les aléas physiques, la vulnérabilité humaine et l'occupation du sol ne sont jamais combinés dans un même calcul.
>
> Deuxièmement, il n'existe aucune historisation spatio-temporelle : faute de référentiel unique, il est impossible de suivre l'évolution d'une tendance sur plusieurs mois.
>
> Troisièmement, la diffusion des alertes manque de réactivité : l'évaluation manuelle retarde la décision et l'information des autorités. »

**C'est la diapo la plus importante du début.** Marquer une pause après chaque limite.

---

### Diapo 9 — Objectifs et périmètre (1 min 15)

> « L'objectif général est de concevoir et réaliser un système géodécisionnel adossé à un entrepôt de données spatiales pour l'analyse des risques climatiques à Madagascar.
>
> Quatre résultats sont attendus. Un pipeline ETL automatisé qui harmonise des flux hétérogènes en WGS 84. Un entrepôt de données spatiales sous PostgreSQL et PostGIS, organisé en constellation. Un moteur multicritère AHP avec contrôle de cohérence, dont le ratio doit rester inférieur à 10 %. Et une plateforme SOLAP interactive, avec alertes et rapports.
>
> Le périmètre fonctionnel couvre la cartographie interactive, la pondération AHP, les alertes temps réel par WebSocket et par courriel, les rapports PDF, Excel et CSV, et trois profils d'utilisateurs : administrateur, analyste et décideur. »

---

### Diapo 10 — Section (5 s)

« Passons à l'analyse et à la conception. »

---

### Diapo 11 — Méthodologie (1 min 15)

> « La conception s'est déroulée en cinq étapes, conformément à la démarche de Kimball et Ross.
>
> J'ai d'abord recensé les données : le contenu de l'entrepôt, les sources, les axes d'analyse, les mesures de fait et la granularité. J'ai ensuite établi un dictionnaire de données décrivant chaque attribut. Puis j'ai formalisé les règles de gestion, d'intégrité spatio-temporelle et les règles métier. Vient ensuite la modélisation dimensionnelle, aux niveaux conceptuel puis logique. Enfin l'alimentation de l'entrepôt par les pipelines ETL.
>
> Les outils de conception sont dbdiagram.io pour les schémas, PostgreSQL 16 pour le SGBD, et PostGIS 3.4 pour les géométries et les index spatiaux GiST. »

---

### Diapo 12 — Analyse de l'existant (1 min)

> « L'analyse de l'existant, menée auprès du BNGRC, de la Direction Générale de la Météorologie et du CPGU, montre un processus en trois temps : une acquisition disparate depuis plusieurs sites, un traitement manuel sous tableur avec des cartes statiques produites sous QGIS, puis une diffusion des alertes par courriel, télécopie ou radio.
>
> Quatre limites en résultent. L'absence d'entrepôt : les données restent dispersées sur des postes individuels. Une évaluation subjective, faute de modèle multicritère. Des cartes statiques, en PDF ou JPEG, sans navigation multi-échelles. Et des délais de diffusion élevés, sans aucune automatisation. »

---

### Diapo 13 — Proposition de solutions (1 min 15)

> « Trois solutions ont été examinées.
>
> La première, un logiciel libre de type QGIS Server ou GeoNode, présente l'avantage de la gratuité et du respect des standards OGC. Elle a été écartée : elle n'offre ni entrepôt, ni cube SOLAP, ni moteur AHP intégré, ni alertes temps réel.
>
> La deuxième, ArcGIS Enterprise, est techniquement éprouvée, mais sa licence coûte entre 18 000 et 25 000 dollars par an, pour un éditeur propriétaire dont la personnalisation AHP est complexe. Elle a été écartée pour son coût récurrent.
>
> La troisième solution, retenue, est un système géodécisionnel sur mesure, entièrement open source. Son atout est l'adéquation exacte aux besoins : ETL automatisé, moteur AHP, alertes temps réel, indépendance technologique. Sa limite est assumée : un investissement initial important. »

**Ne pas** s'excuser du choix. La limite est écrite sur la diapo : la reconnaître est un signe de maîtrise.

---

### Diapo 14 — Architecture fonctionnelle (1 min)

> « L'architecture fonctionnelle s'organise en cinq maillons.
>
> Les données d'abord : sources satellitaires, météorologiques et administratives, dont CHIRPS, WorldPop et GADM. Puis l'ETL, qui extrait, harmonise en WGS 84, normalise et charge. Vient ensuite l'entrepôt spatial, en constellation sous PostgreSQL et PostGIS, alimenté par les statistiques zonales. Puis la couche d'analyse : modèles de risque, AHP, et cube SOLAP avec les opérations de forage, d'agrégation, de tranchage et de découpage. Enfin la décision : carte, tableau de bord, alertes et rapports.
>
> Chaque traitement raster est tracé dans l'entrepôt, dans la table FACT_RASTER_PROCESSING, et l'historique des indicateurs est conservé. »

---

### Diapo 15 — Schéma en constellation (1 min)

> « Le modèle de données adopte un schéma en constellation : trois tables de faits partagent quatre dimensions.
>
> Les tables de faits sont FACT_RISK_INDICATOR, qui porte les indicateurs de risque ; FACT_CLIMATE_OBSERVATION, qui porte les observations climatiques ; et FACT_RASTER_PROCESSING, qui assure la traçabilité des traitements.
>
> Les dimensions communes sont DIM_ZONE, avec les 1 565 entités administratives ; DIM_TIME, la dimension temporelle ; DIM_RISK_TYPE, les cinq typologies d'aléas ; et DIM_DATA_SOURCE, les huit sources de données.
>
> Le choix de la constellation plutôt que de l'étoile tient à ce que les trois tables de faits partagent effectivement les mêmes axes d'analyse : c'est la condition posée par Kimball. »

**Point d'anticipation :** la question « pourquoi une constellation et non une étoile ? » est très probable. La réponse est dans la dernière phrase.

---

### Diapo 16 — Section (5 s)

« Passons à la réalisation. »

---

### Diapo 17 — Architecture technique (1 min)

> « L'architecture technique se lit en quatre couches.
>
> L'ingestion repose sur Python, avec Rasterio, GeoPandas et NumPy pour les pipelines ETL. L'entrepôt et le stockage associent PostgreSQL 16, PostGIS 3.4, le schéma dwh et MinIO pour le stockage objet. La couche métier combine un microservice FastAPI dédié au calcul AHP, et une API NestJS avec REST, JWT et WebSocket. La restitution est une application monopage en React, avec Leaflet pour la cartographie et Tailwind CSS pour les styles. »

---

### Diapo 18 — Outils (45 s)

> « Les outils retenus couvrent l'ensemble de la chaîne : dbdiagram.io pour la modélisation, PostgreSQL et PostGIS pour le stockage spatial, Python pour l'ETL, MinIO pour les rapports, Docker pour la conteneurisation, FastAPI et NestJS côté serveur, React, Vite et Leaflet côté client, et Git avec GitHub pour la gestion de versions. »

**Aller vite.** Cette diapo ne demande pas de commentaire.

---

### Diapo 19 — Démonstration (6 min)

Voir la section 3 ci-dessous.

---

### Diapo 20 — Conclusion (1 min 15)

> « Pour conclure, ce travail a produit un système complet, de la collecte à la décision.
>
> Cinq modèles de risque opérationnels couvrent les 1 565 zones administratives. L'entrepôt spatial est interrogeable en SOLAP : il contient aujourd'hui 39 125 faits d'indicateurs, répartis sur plusieurs périodes d'observation, ce qui matérialise la profondeur temporelle du cube. La plateforme génère des alertes et des rapports dans quatre formats.
>
> Cinq perspectives prolongent ce travail. L'intégration de l'indice standardisé de précipitation sur trente ans, pour affiner le modèle sécheresse. L'apprentissage automatique pour la prévision hydrologique. Le radar Sentinel-1 pour le suivi des inondations. La parallélisation des calculs raster à haute résolution. Et une application mobile de collecte participative. »

---

### Diapo 21 — Merci (10 s)

> « Je vous remercie de votre attention, et je me tiens à votre disposition pour répondre à vos questions. »

**S'arrêter net.** Ne pas ajouter de commentaire, ne pas s'excuser.

---

## 3. Démonstration (6 minutes)

**Avant de commencer :** trois terminaux ouverts en arrière-plan (backend, frontend, Docker). Navigateur sur `http://localhost:3000`, zoom à 110 %, notifications système désactivées.

| Temps | Écran | Ce qui est dit |
|---|---|---|
| 0:00 | Accueil public | « Voici la page d'accueil de RISKCLIM-MG. J'accède à la plateforme. » |
| 0:20 | Connexion | « Je m'authentifie en tant qu'administrateur : le contrôle des rôles est actif. » |
| 0:40 | Tableau de bord | Voir ci-dessous |
| 2:40 | Carte des risques | « La carte restitue les 22 régions, 110 districts et 1 433 communes, avec coloration choroplèthe et superposition des dalles raster. » |
| 3:40 | Analyses & Décision | « Le module AHP affiche la matrice de comparaison par paires. Le modèle inondation retient 50 % pour les précipitations et 25 % pour chacun des deux autres critères. La cohérence est vérifiée : λmax vaut 3, l'indice de cohérence est nul et le ratio vaut 0,00 %, très en dessous du seuil de 10 %. » |
| 5:00 | Alertes | « 29 alertes enregistrées, dont 26 actives, 1 critique et 3 résolues. Chaque ligne porte la population exposée de sa zone, issue du croisement WorldPop. » |
| 5:40 | Rapports | « Les rapports sont générés en PDF, Excel et CSV. » |

### Texte du tableau de bord (2 minutes)

> « Le tableau de bord est le point d'entrée opérationnel. Il présente six indicateurs.
>
> L'indice national de risque, moyenné et pondéré par AHP. La population exposée estimée, issue du croisement du raster WorldPop avec les aléas : 27,63 millions d'habitants. Les zones à surveiller, c'est-à-dire les couples zone-aléa dont le score dépasse 80 sur 100. Le point chaud territorial. Les couches raster chargées dans l'entrepôt, au nombre de 19. Et l'état des flux de données : 7 sources connectées sur 8.
>
> Ce dernier indicateur mérite un mot. La huitième source, CHIRPS, a échoué lors de sa dernière synchronisation : le serveur de l'Université de Californie a refusé la connexion. Les précipitations exploitées sont donc celles du dernier téléchargement réussi, le 24 septembre. La plateforme détecte cette indisponibilité et la signale, plutôt que d'utiliser silencieusement des données périmées.
>
> En dessous, le filtrage SOLAP permet de choisir l'aléa et la maille administrative. La distribution des niveaux de risque s'appuie sur 110 entités région-aléa. Et le graphique de droite présente la rétrospective temporelle issue de l'entrepôt. »

**Anticiper soi-même le 7/8.** Le jury le verra de toute façon ; mieux vaut l'expliquer avant qu'il ne pose la question.

---

## 4. Chiffres à connaître par cœur

| Élément | Valeur |
|---|---|
| Entités administratives | 22 régions, 110 districts, 1 433 communes = **1 565** |
| Typologies de risque | **5** (GLOBAL, FLOOD, DROUGHT, LANDSLIDE, CYCLONE) |
| Sources de données | **8** |
| Faits dans l'entrepôt | **39 125** (soit 1 565 × 5 par période) |
| Population exposée | **27 630 458** habitants |
| Alertes | **29** au total, **26** actives, **3** résolues, **1** critique |
| Signaux opérationnels | **88**, dont 21 élevés et 1 critique |
| AHP inondation | **50 % / 25 % / 25 %** — λmax = 3, CI = 0, **CR = 0,00 %** |
| Indice national de risque | **11,74 / 100** |
| Couches raster | **19** |
| Sources connectées | **7 / 8** |

**Vérifier « 68 zones à surveiller » et « 19 rasters » avant l'oral** : ces deux valeurs datent d'un relevé antérieur.

---

## 5. Ce qu'il ne faut pas dire

**Ne jamais promettre le temps réel météo.** La synchronisation automatique OpenWeather est désactivée ; la météo se rafraîchit à la demande depuis la page Alertes. Dire : « les signaux opérationnels combinent le risque de fond et la dernière observation météo disponible ».

**Ne pas mentionner TC-SIMULATION-DEMO.** Ces alertes de démonstration ont été supprimées de la base. Il n'existe plus d'alerte fictive.

**Ne pas cliquer sur trois boutons :** « Lancer le pipeline de risque » (bloqué par CHIRPS, gèle l'écran), « Démo » à côté des cyclones GDACS (crée des alertes fictives), et « Vérifier alertes » (génère des alertes sans passer par les signaux).

**Ne pas montrer l'interface MinIO** sur le port 9001, ni les onglets « Jobs ETL » et « Traçabilité ETL ».

**Ne pas annoncer de temps d'exécution** que vous n'avez pas mesuré.

---

## 6. Questions probables du jury

**« Pourquoi une constellation et non un schéma en étoile ? »**
> « Parce que trois tables de faits partagent effectivement les mêmes dimensions. Kimball réserve la constellation au cas où plusieurs processus métier distincts — ici les indicateurs de risque, les observations climatiques et la traçabilité des traitements — se rapportent aux mêmes axes d'analyse. »

**« Comment garantissez-vous la cohérence de l'entrepôt ? »**
> « Par deux mécanismes. À la construction, les clés de substitution sont générées par jointure sur les dimensions, et le volume de faits est contrôlé arithmétiquement : 1 565 zones par 5 typologies donnent 7 825 faits par période. À l'usage, chaque rechargement supprime les faits de la seule période recalculée avant de les réinsérer, ce qui préserve l'historique. »

**« Que se passe-t-il si une source est indisponible ? »**
> « Le pipeline s'arrête à l'étape concernée plutôt que de propager une valeur erronée, et la source est marquée en échec dans la table data_sources. C'est ce qui s'est produit avec CHIRPS : le tableau de bord affiche 7 sources sur 8, et les traitements en aval conservent les données du dernier téléchargement réussi. »

**« Comment est vérifiée la cohérence des jugements AHP ? »**
> « Par le ratio de cohérence de Saaty. Pour la matrice inondation à trois critères, la valeur propre maximale vaut 3, l'indice de cohérence est nul, et le ratio vaut 0,00 %, très en dessous du seuil de 10 % au-delà duquel les jugements doivent être révisés. Le calcul est fait par un microservice FastAPI, avec un moteur de secours en TypeScript. »

**« Les populations exposées sont-elles fiables ? »**
> « Elles sont calculées par sommation des effectifs du raster WorldPop 2020 à sa résolution native de cent mètres, et non sur une couche interpolée qui lisserait les effectifs. Le total national obtenu, 27,63 millions d'habitants, est cohérent avec les projections des Nations Unies pour 2020. La vérification interne est que la somme des 22 régions égale exactement la somme des 110 districts. »

**« Quelle est la limite principale de votre travail ? »**
> « La dépendance à un serveur unique pour les précipitations, et l'absence d'étalonnage du modèle sécheresse sur une longue série. Les deux sont identifiées dans le mémoire, et la première est signalée en temps réel par la plateforme. »

---

## 7. Liste de contrôle, trente minutes avant

1. `docker ps` — le conteneur PostGIS doit afficher `0.0.0.0:5433->5432/tcp`.
2. Backend démarré — `Nest application successfully started`.
3. Frontend démarré — page d'accueil accessible sur le port 3000.
4. Connexion testée avec le compte administrateur.
5. Tableau de bord affichant 27,6 M et non 48,3 k.
6. Alertes : 29 au total, 26 actives.
7. Onglet « Résolues » : 3 lignes.
8. Une carte raster affichée sur la page Carte des risques.
9. Un rapport PDF généré une fois, pour vérifier que le module répond.
10. Téléphone en silencieux, notifications du navigateur désactivées.

---

## 8. Plan de secours

**Si le frontend ne répond plus :** basculer sur les captures du mémoire, page 118 à 126, et poursuivre la démonstration à l'écrit. Ne pas chercher à réparer devant le jury.

**Si un calcul échoue :** annoncer « ce traitement est bloqué par l'indisponibilité de la source CHIRPS », ce qui est vrai et documenté.

**Si une question vous dépasse :** « Ce point n'a pas été traité dans ce travail ; il figure parmi les perspectives. » Une limite reconnue vaut mieux qu'une réponse improvisée.
