# Démonstration RISKCLIM-MG — le cycle de vie de la donnée

**Fil conducteur :** Collecter → Transformer → Analyser → Restituer → Décider
**Durée cible :** 6 minutes 20 (à intégrer dans une soutenance de 15 à 20 minutes)
**Scénario retenu :** le risque d'inondation sur la côte Est

---

## 0. Préparation, la veille de la soutenance

### Ce qui doit tourner

| Élément | Vérification |
|---|---|
| Conteneur PostGIS | `docker ps` → `0.0.0.0:5433->5432/tcp` |
| Backend | `Nest application successfully started` |
| Frontend | `http://localhost:3000` accessible |
| Compte | connexion administrateur testée |
| Navigateur | zoom 110 %, notifications système coupées, onglet unique |

### Les quatre relevés à faire avant

Ces requêtes remplissent les blancs du script. Exécutez-les et notez les résultats sur une feuille.

```sql
-- A. Quel job ETL terminé montrer à l'étape 2
SELECT id, status, started_at::date, duration_ms,
       left(coalesce(message,''), 70) AS message
FROM etl_pipeline_jobs
ORDER BY started_at DESC NULLS LAST
LIMIT 5;

-- B. Les régions les plus exposées à l'inondation, pour choisir la zone du scénario
SELECT zone_nom, risk_max, risk_mean, population_exposed::bigint
FROM zone_risk_indicators
WHERE risk_type::text = 'FLOOD' AND zone_type::text = 'region'
ORDER BY risk_max DESC
LIMIT 8;

-- C. Les alertes d'inondation actives
SELECT zone_nom, niveau::text, risk_value, population_exposed::bigint, status::text
FROM alertes
WHERE type::text = 'INONDATION'
ORDER BY risk_value DESC NULLS LAST;

-- D. Nombre de couches raster disponibles sur la carte
SELECT COUNT(*) AS couches FROM rasters;
```

**Blancs à renseigner :**

| Notation | Élément | Relevé |
|---|---|---|
| `[ZONE]` | région choisie pour le scénario | ........... |
| `[SCORE]` | son score de risque inondation | ........... |
| `[POP]` | sa population exposée | ........... |
| `[JOB]` | date du job ETL terminé | ........... |

> À défaut de relevé, le scénario fonctionne correctement avec **Atsinanana** : c'est une région littorale de l'Est, et elle porte une alerte d'inondation active pour **1 281 972 habitants exposés**.

### Ce qu'il ne faut pas préparer

**Ne lancez pas le pipeline de risque** avant la soutenance pour « avoir un job récent » : la source CHIRPS est bloquée par le serveur de l'Université de Californie, l'étape échouerait et créerait un job en échec supplémentaire. L'onglet « Jobs ETL » contient déjà l'historique nécessaire.

---

## 1. Annonce du scénario · 20 secondes

**Écran :** la page d'accueil publique, ou le tableau de bord sans rien cliquer.

> « Pour présenter l'application, nous allons suivre un scénario complet.
>
> L'objectif est d'évaluer le niveau de risque d'inondation dans une zone de Madagascar, à partir de données géographiques et climatiques hétérogènes, puis de produire une information permettant aux décideurs d'agir.
>
> La démonstration suit le cycle de vie de la donnée : collecter, transformer, analyser, restituer, décider. »

**Ne pas** commencer par « je vais vous montrer le menu ». Le menu est un moyen de navigation, jamais un sujet.

---

## 2. ÉTAPE 1 — Collecter · 50 secondes

**Question à laquelle vous répondez :** d'où viennent les données ?

**Chemin :** menu **Données** → onglet **Sources**

### Manipulation

1. ouvrir la page Données ;
2. rester sur l'onglet **Sources** ;
3. montrer la liste des huit sources et leur statut ;
4. s'arrêter sur CHIRPS, en échec, et l'expliquer ;
5. ne rien sélectionner d'autre.

### Discours

> « La première étape est la collecte.
>
> Le système récupère des données provenant de huit sources nationales et internationales. CHIRPS fournit les précipitations journalières. WorldPop donne la population par pixel. Copernicus DEM apporte l'altitude, à trente mètres de résolution. ESA WorldCover renseigne l'occupation du sol. HydroRIVERS décrit le réseau hydrographique. NASA POWER et OpenWeather fournissent les séries climatiques et les observations météorologiques. GDACS et IBTrACS documentent les trajectoires cycloniques. Enfin GADM fournit les limites administratives.
>
> Ces données sont hétérogènes : certaines sont des rasters, d'autres des vecteurs, des fichiers tabulaires ou des réponses d'API. Elles ne peuvent donc pas être analysées directement.
>
> Vous remarquez qu'une source est signalée en échec : CHIRPS. Le serveur de l'Université de Californie a refusé la connexion lors de la dernière synchronisation. La plateforme le détecte et l'affiche. Les précipitations exploitées sont donc celles du dernier téléchargement réussi, le 24 septembre. »

### Piège à éviter

Ne pas lancer de synchronisation. Ne pas ouvrir l'onglet « Cyclones (GDACS) » : le bouton « Démo » y crée des alertes fictives.

### Transition

> « Une fois collectées, ces données doivent être nettoyées, harmonisées et préparées. Nous passons à la transformation. »

---

## 3. ÉTAPE 2 — Transformer · 50 secondes

**Question à laquelle vous répondez :** comment les données deviennent-elles exploitables ?

**Chemin :** même page → onglet **Jobs ETL**

### Manipulation

1. cliquer sur l'onglet **Jobs ETL** ;
2. montrer un job **terminé avec succès** dans l'historique ;
3. montrer les étapes du job et sa durée ;
4. mentionner le statut et l'absence d'erreur.

### Discours

> « La deuxième étape est la transformation, assurée par un pipeline ETL : extraire, transformer, charger.
>
> Les données arrivent dans des formats, des résolutions et des systèmes de coordonnées différents. Le pipeline les harmonise : il télécharge, valide les fichiers, les reprojette en WGS 84, les découpe sur l'emprise de Madagascar, aligne les rasters sur une grille commune, normalise chaque indicateur entre zéro et un, puis calcule les statistiques pour chaque zone administrative avant de les charger dans PostgreSQL et PostGIS.
>
> Un point technique important concerne la population exposée. Nous lisons le raster WorldPop brut, à sa résolution native de cent mètres, et nous sommons les effectifs pixel par pixel. Nous n'utilisons pas la couche rééchantillonnée par interpolation bilinéaire : celle-ci lisserait les effectifs et fausserait le total. C'est cette précaution qui produit 27,63 millions d'habitants, au lieu des quelques dizaines de milliers obtenues avec une couche interpolée.
>
> Cet historique montre un pipeline exécuté et terminé : chaque étape est tracée, avec son statut et sa durée. »

### Piège à éviter

**Ne cliquez pas sur « Lancer le pipeline de risque ».** Cette action exécute vingt-et-un scripts pendant plusieurs heures, et la première étape échouerait sur CHIRPS. Montrez l'historique, jamais un lancement.

### Transition

> « Les données sont maintenant propres, harmonisées et organisées par zone administrative. Elles peuvent servir à calculer et comparer les risques. »

---

## 4. ÉTAPE 3 — Analyser · 1 minute 30

**Question à laquelle vous répondez :** comment le risque est-il calculé ?

Il s'agit de **deux écrans**, dans cet ordre : la pondération, puis le calcul territorialisé.

### 4a. La pondération — menu **Analyses & Décision** → *Modèle AHP (Saaty)* · 45 s

**Manipulation :** afficher la matrice de comparaison par paires du modèle « Aléa inondation ».

**Discours**

> « L'analyse ne se limite pas à observer un aléa : elle combine plusieurs critères pondérés.
>
> La méthode AHP de Saaty permet de comparer les critères deux à deux, sur une échelle de un à neuf. Pour le modèle inondation à trois critères, l'expert retient 50 % pour les précipitations, 25 % pour la pente inversée issue du modèle numérique de terrain, et 25 % pour la proximité au réseau hydrographique.
>
> Le système vérifie ensuite la rationalité des jugements. La valeur propre maximale vaut 3, l'indice de cohérence est nul, et le ratio de cohérence vaut zéro pour cent — très en dessous du seuil de dix pour cent au-delà duquel l'expert doit réviser ses jugements. »

**Ne pas** modifier les poids. Ne pas cliquer sur « Enregistrer » ni sur « Recalculer ».

### 4b. Le calcul territorialisé — menu **Analyses & Décision** → *Explorateur SOLAP* · 45 s

**Manipulation**

1. sélectionner l'aléa **Inondation** ;
2. conserver la granularité **Régions** ;
3. afficher la vue pivot, une ligne par région ;
4. montrer la colonne du risque inondation, en la comparant aux autres aléas ;
5. repérer `[ZONE]` dans le classement.

**Discours**

> « Une fois les critères pondérés, le score est calculé pour chaque zone administrative. Le croisement spatial entre les rasters de risque et les polygones GADM produit un indicateur pour chacune des 1 565 entités : 22 régions, 110 districts et 1 433 communes.
>
> L'explorateur SOLAP permet de choisir l'aléa, la maille administrative et l'année. Ici, en vue pivot, chaque ligne présente une région et ses scores pour les cinq aléas. Le décideur peut ainsi comparer immédiatement les territoires, et non des indicateurs isolés.
>
> `[ZONE]` apparaît parmi les régions les plus exposées à l'inondation, avec un score de `[SCORE]` sur 100. »

### Piège à éviter

Ne pas lancer de recalcul. Se contenter de lire et de changer la granularité, ce qui est sans effet sur les données.

### Transition

> « Un résultat numérique seul reste difficile à interpréter. Le système doit donc le restituer sous une forme claire, cartographique et synthétique. »

---

## 5. ÉTAPE 4 — Restituer · 1 minute 20

**Question à laquelle vous répondez :** comment comprendre les résultats ?

Deux écrans : la carte, puis le tableau de bord.

### 5a. La carte — menu **Carte des risques** · 50 s

**Manipulation**

1. afficher la couche de risque inondation ;
2. montrer la légende et les quatre niveaux ;
3. zoomer sur la côte Est ;
4. cliquer sur `[ZONE]` pour ouvrir ses indicateurs détaillés.

**Discours**

> « La carte restitue les 22 régions, 110 districts et 1 433 communes, avec une coloration choroplèthe selon le niveau de gravité, et la superposition des dalles raster.
>
> La légende distingue quatre niveaux : faible, moyen, élevé et critique. En cliquant sur `[ZONE]`, on obtient ses indicateurs : le score de risque, sa moyenne, la population exposée et sa superficie. »

**Ne pas** dire « ici nous avons la carte ». Dire ce qu'elle **montre**.

### 5b. Le tableau de bord — menu **Tableau de bord** · 30 s

**Manipulation :** afficher le tableau de bord, sans défiler trop vite.

**Discours**

> « Après le calcul, les résultats sont consolidés dans ce tableau de bord.
>
> L'indice national de risque s'établit à 11,74 sur 100. La population exposée estimée atteint 27,63 millions d'habitants. Les zones à surveiller correspondent aux couples zone-aléa dont le score dépasse 80 sur 100.
>
> La distribution montre la répartition des 110 entités région-aléa entre les quatre niveaux, et le graphique présente la rétrospective temporelle issue de l'entrepôt : plusieurs périodes y sont conservées, ce qui permet de suivre une évolution et non seulement un état. »

**Option, si le temps le permet :** menu **Rapports**, et montrer qu'un rapport PDF, Excel ou CSV peut être produit. Une phrase suffit.

### Piège à éviter

Ne pas parler du compteur « 7 sources sur 8 » une seconde fois : il a été expliqué à l'étape 1.

### Transition

> « La restitution permet de comprendre la situation. Mais la finalité du système est d'aider les responsables à décider. »

---

## 6. ÉTAPE 5 — Décider · 1 minute

**Question à laquelle vous répondez :** quelle action prioriser ?

**Chemin :** menu **Alertes**

### Manipulation

1. afficher les quatre cartes de synthèse ;
2. ouvrir une alerte d'inondation — celle de `[ZONE]` si elle existe ;
3. montrer le niveau, la zone, la date, le risque maximal et la population exposée ;
4. ouvrir l'onglet **Signaux opérationnels** et montrer le signal correspondant ;
5. ne rien résoudre, ne rien ignorer.

### Discours

> « La dernière étape est la décision.
>
> Lorsque les indicateurs dépassent les seuils, le système génère une alerte. On en compte 29 au total, dont 26 actives, une critique et trois résolues.
>
> Chaque alerte porte le type de risque, le niveau de gravité, la zone concernée, le score atteint et la population potentiellement exposée. Ces éléments permettent de hiérarchiser les interventions : une alerte critique sur une zone de plus d'un million d'habitants ne se traite pas comme une alerte élevée sur une zone peu peuplée.
>
> L'onglet des signaux opérationnels montre la couche de surveillance sous-jacente : quatre-vingt-huit signaux combinent le risque de fond issu des indicateurs zonaux et la dernière observation météo disponible. Ce sont ces signaux qui déclenchent les alertes.
>
> Le décideur dispose donc d'une information datée, spatialisée et chiffrée. Il peut diffuser l'alerte, préparer les moyens d'intervention et suivre l'évolution de la situation en changeant le statut de l'alerte une fois le risque écarté. »

### La nuance à ne pas oublier

> « L'application fournit une aide à la décision. Elle ne remplace pas l'autorité humaine : la décision finale reste sous la responsabilité des autorités compétentes. Le système apporte des éléments objectifs, spatialisés et actualisés pour éclairer cette décision. »

### Piège à éviter

Ne jamais cliquer sur **« Alertes opérationnelles »** (le bouton violet) pendant la démonstration : il relance une synchronisation météo et régénère les alertes, ce qui ferait bouger les chiffres devant le jury.

### Transition

> « Cette démonstration montre que l'application ne se limite pas à afficher des cartes. Elle met en place une chaîne complète, allant de la collecte de données hétérogènes jusqu'à la production d'informations utiles à la décision. »

---

## 7. Tableau récapitulatif

| Étape | Durée | Question | Écran | Fonction montrée |
|---|---|---|---|---|
| Annonce | 0:20 | — | Accueil | Le fil conducteur |
| **1. Collecter** | 0:50 | D'où viennent les données ? | Données → Sources | 8 sources, statuts, CHIRPS en échec |
| **2. Transformer** | 0:50 | Comment deviennent-elles exploitables ? | Données → Jobs ETL | ETL, harmonisation, PostGIS, statistiques zonales |
| **3. Analyser** | 1:30 | Comment le risque est-il calculé ? | Analyse (AHP) puis SOLAP | Pondérations, CR = 0 %, indicateurs par zone |
| **4. Restituer** | 1:20 | Comment comprendre les résultats ? | Carte puis Tableau de bord | Cartographie, KPI, distribution, historique |
| **5. Décider** | 1:00 | Quelle action prioriser ? | Alertes | 29 alertes, niveaux, population exposée |
| Clôture | 0:30 | — | — | Synthèse |
| | **6:20** | | | |

### Variante courte — 4 minutes

Si le temps manque : étapes 1 et 2 à 30 secondes chacune (une phrase et deux clics), étape 3 réduite à l'écran AHP seul, étape 4 sans la carte. Le fil conducteur reste intact.

---

## 8. Aide-mémoire des chiffres

| Élément | Valeur |
|---|---|
| Sources de données | **8** (7 connectées, CHIRPS en échec) |
| Entités administratives | **1 565** = 22 régions + 110 districts + 1 433 communes |
| Typologies d'aléas | **5** |
| Faits dans l'entrepôt | **39 125** |
| Population exposée | **27 630 458** |
| Alertes | **29** au total, **26** actives, **1** critique, **3** résolues |
| Signaux opérationnels | **88** |
| AHP inondation | **50 / 25 / 25** — λmax = 3, CI = 0, **CR = 0,00 %** |
| Indice national de risque | **11,74 / 100** |
| Couches raster | **19** |

---

## 9. Plan de secours

**CHIRPS en échec, et le jury demande pourquoi :**
> « Le serveur de l'Université de Californie a bloqué l'accès après des requêtes répétées. Le pipeline s'arrête proprement à cette étape plutôt que de propager une donnée périmée, et la source est marquée en échec. C'est un comportement voulu : mieux vaut une source signalée indisponible qu'une donnée périmée utilisée sans avertissement. »

**Le frontend ne répond plus :**
Basculer sur les captures du mémoire, pages 118 à 126, et poursuivre la démonstration à l'écrit. Ne pas réparer devant le jury.

**Un écran met du temps à charger :**
Meubler avec le commentaire technique correspondant, sans commenter la lenteur.

**Une question vous dépasse :**
> « Ce point n'a pas été traité dans ce travail ; il figure parmi les perspectives. »

---

## 10. Les cinq erreurs à ne pas commettre

1. **Annoncer les menus** au lieu des étapes. Toujours dire « nous passons à la transformation », jamais « maintenant je clique sur Données ».
2. **Décrire un écran** au lieu d'en tirer une conclusion. Toujours terminer par ce que l'écran démontre.
3. **Lancer le pipeline de risque.** Il échoue sur CHIRPS et gèle l'interface.
4. **Cliquer sur « Alertes opérationnelles »** ou sur « Démo » : les chiffres changeraient devant le jury.
5. **Promettre le temps réel météo.** Dire « la dernière observation météo disponible », jamais « en temps réel » sans nuance.
