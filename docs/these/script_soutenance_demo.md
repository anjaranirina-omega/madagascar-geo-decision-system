# Script de soutenance — RISKCLIM-MG

**Document de conduite de démonstration**
État de référence : 31 octobre 2026 — 23 alertes actives, dont 1 critique.
Chiffres alignés sur la base courante.

---

## Sommaire

1. Parcours de 8 minutes (version complète)
2. Parcours de 4 minutes (version resserrée)
3. Scripts page par page
4. Fiche des boutons — action réelle de chacun
5. Questions probables du jury et réponses
6. Pièges à éviter absolument
7. Liste de contrôle avant de passer
8. Plan de secours

---

## 1. Parcours de 8 minutes

| # | Page | Durée | Transition de sortie |
|---|---|---|---|
| 1 | Accueil public | 0:45 | « Entrons dans la plateforme. » |
| 2 | Connexion | 0:20 | « Me voici authentifié en tant qu'administrateur. » |
| 3 | Tableau de bord | 2:30 | « Ces indicateurs viennent de l'entrepôt. Voyons comment ils sont calculés. » |
| 4 | Carte des risques | 1:30 | « La carte donne la lecture territoriale. Voyons la pondération. » |
| 5 | Analyses & Décision | 1:45 | « Ces modèles alimentent les alertes. » |
| 6 | Alertes | 1:00 | « Ces alertes s'appuient sur des données fraîches. » |
| 7 | Données | 0:40 | « Et l'on restitue tout cela en rapports. » |
| 8 | Rapports | 0:40 | Clôture |
| | **Total** | **9:10** | Réduire les analyses si contrainte |

**Réglage pour tenir 8:00** : passer Analyses & Décision à 1:15 (ne montrer que l'AHP et le SOLAP) et Rapports à 0:30.

---

## 2. Parcours de 4 minutes

| # | Page | Durée |
|---|---|---|
| 1 | Accueil public | 0:30 |
| 2 | Tableau de bord | 1:30 |
| 3 | Alertes | 1:00 |
| 4 | Rapports | 0:45 |
| | **Total** | **3:45** |

Supprimer : Carte, Analyses, Données. Les mentionner oralement en une phrase :
> « La carte, l'analyse multicritère et la gestion des sources sont accessibles depuis le menu ; je ne les détaille pas ici. »

---

## 2 bis. Enchaînements oraux

Les phrases de liaison, à prononcer mot pour mot. Elles évitent les hésitations entre deux écrans.

| Passage | Phrase de liaison |
|---|---|
| Accueil → Connexion | « Entrons dans la plateforme. » |
| Connexion → Tableau de bord | « Me voici authentifié en tant qu'administrateur. Voici le tour de contrôle. » |
| Tableau de bord → Carte | « Ces indicateurs agrégés viennent de l'entrepôt. Regardons-les maintenant sur le territoire. » |
| Carte → Analyses | « La carte donne la lecture spatiale. Reste à savoir comment ces indices sont pondérés. » |
| Analyses → Alertes | « Ces modèles pondérés alimentent le module d'alerte. » |
| Alertes → Données | « Ces alertes reposent sur des données synchronisées. Voyons d'où elles viennent. » |
| Données → Rapports | « Et l'ensemble est restitué sous forme de rapports institutionnels. » |
| Rapports → Clôture | « Le parcours est complet : de la donnée satellitaire jusqu'au rapport transmissible. » |

**Règle** : chaque transition annonce la page suivante *et* justifie le lien logique. Ne jamais dire « on passe à la suite ».

---

## 3. Scripts page par page

### 3.1. Accueil public — 45 s

> RISKCLIM-MG est un système géodécisionnel climatique pour Madagascar. Il ne se contente pas de cartographier : il transforme des données brutes — satellites, recensements, relevés météo — en indicateurs territoriaux, en alertes et en rapports exploitables par les décideurs.
>
> Quatre chiffres résument le périmètre. **1 565** zones administratives : 22 régions, 110 districts, 1 433 communes. **5** aléas suivis : inondation, sécheresse, cyclone, glissement de terrain, et l'indice global qui les combine. **8** sources de données, dont CHIRPS, NASA POWER, WorldPop et ESA WorldCover. Et un **entrepôt de données** en étoile, mémoire du système et base des analyses multidimensionnelles.
>
> Le fonctionnement suit cinq étapes : collecter, transformer, analyser, restituer, décider.

**Ne pas dire** : « risque élevé » / « risque modéré » sous chaque aléa — ces étiquettes sont écrites dans le code et ne varient pas avec les données.

---

### 3.2. Connexion — 20 s

> L'accès est nominatif et contrôlé. Trois niveaux de droits : administrateur, analyste, décideur. Je me connecte avec un compte administrateur.

*(connexion)*

> L'authentification génère un jeton signé qui accompagne chaque requête.

**Ne pas dire** : CAPTCHA, double authentification, limitation des tentatives, envoi d'email pour le mot de passe oublié.

**Question probable — « Pourquoi pas d'inscription libre ? »**
> Système institutionnel : les comptes sont créés par l'administrateur, tout accès est traçable.

**Question probable — « Comment sont stockés les mots de passe ? »**
> Hachés avec bcrypt, jamais en clair.

---

### 3.3. Tableau de bord — 2 min 30

#### Vue d'ensemble stratégique (60 s)

> Voici le tour de contrôle. Trois niveaux de lecture, du plus synthétique au plus détaillé.
>
> **En haut, six indicateurs.** L'indice national de risque moyen pondéré par AHP : **12,5 sur 100**. La population exposée, croisement raster WorldPop × aléas : **27,63 millions d'habitants**. Les zones à surveiller : **68**, dont **2 couples zone-aléa** au-delà du seuil de 80. Le point chaud : **Analamanga**, 89,9 sur 100 en sécheresse. **19 couches raster**, et **7 sources sur 8** opérationnelles.
>
> **À gauche, la répartition des niveaux de risque.** Le camembert porte sur **110 entités**, c'est-à-dire 22 régions × 5 aléas — et non 110 régions. 15 faibles, 27 moyennes, 66 élevées, 2 critiques.
>
> **À droite, l'évolution temporelle issue de l'entrepôt.** Le point correspond à la période chargée, à 63 sur 100.
>
> **En bas, deux lectures croisées.** L'intensité moyenne par aléa place la **sécheresse** en tête à 71,6, devant l'inondation à 67,7, le glissement à 60,9 et le cyclone à 51,8. Le **Top 8** classe par score décroissant : Analamanga apparaît deux fois, sécheresse puis inondation.

**Ne pas dire** : « veille GDACS 24/7 » (bannière statique, ligne 542 de `DashboardPage.tsx`), « rétrospective pluriannuelle » (un seul point), « 27 millions de sinistrés » (c'est la population des zones couvertes).

#### Risques par région (30 s)

> La matrice complète, 22 régions × 5 aléas. Chaque cellule porte le score maximal de la région pour l'aléa, avec code couleur par classe. Source : la vue matérialisée `mv_regional_risk_summary`, rafraîchie par le pipeline.

#### Sources & Pipelines ETL (20 s)

> Huit sources, sept connectées. Les cinq référentiels géospatiaux à 07:04, OpenWeather à 12:00. IBTrACS en attente : import de fichier, non flux permanent.

#### Météo & Couches Rasters (20 s)

> Indicateurs NASA POWER — 25,4 °C, 62,6 % d'humidité, 1,9 m/s de vent, 1 mm de pluie — et catalogue des couches raster actives : proximité des rivières, occupation du sol, population, pente, précipitations, classes de risque.

**Ne pas commenter** le cadre de droite « Traçabilité des Traitements ETL » : il est vide.

---

### 3.4. Carte des risques — 1 min 30

> Trois zones à l'écran.
>
> **À gauche, le sélecteur de couches.** Cinq rasters superposables, chacun avec sa composition — pour l'inondation : HydroRIVERS, CHIRPS, pente, exposition. En dessous, la version temporelle et le niveau administratif.
>
> **Au centre, la carte Leaflet.** Fond OpenStreetMap, limites GADM. J'active le point de localisation et je clique sur Antananarivo.

*(clic)*

> Une infobulle donne les coordonnées et les trois niveaux d'emboîtement : commune, district d'Antananarivo-Nonivotra, région Analamanga.
>
> **À droite, la fiche zonale.** Risque global local : **24 sur 100**, classé *Faible*. Population exposée : **1,04 million**. Puis la documentation du raster actif — grille 420 × 720 pixels, résolution 0,019°, EPSG:4326 — et la météo actuelle depuis OpenWeather.

**Ne pas cliquer sur « Cyclone Démo »** — injecte un cyclone fictif et crée une alerte critique artificielle.

**Ne pas commenter spontanément la superficie** (92 km²) : la valeur de la région Analamanga dans SOLAP est 19 369 km², et l'écart peut intriguer.

**Si on demande le calcul :**
> Le raster de risque est croisé avec les polygones. Pour chaque zone, on retient les pixels intérieurs, on calcule moyenne et maximum, et on additionne la population WorldPop de ces pixels. Le niveau est déduit du **maximum**, pas de la moyenne, pour qu'un pic local ne soit pas gommé.

---

### 3.5. Analyses & Décision — 1 min 45

#### Modèle AHP (60 s)

> L'analyse multicritère repose sur la méthode AHP de Saaty, en deux blocs.
>
> **Les poids spécifiques.** On choisit un modèle — ici Inondation — et l'on pondère deux familles. Côté **aléa** : pente inversée 0,25, précipitations CHIRPS 0,40, proximité riveraine 0,35. Côté **risque** : aléa inondation 0,65, occupation du sol 0,15, population exposée 0,20.
>
> **La matrice de comparaison par paires.** Le jugement expert sur l'échelle de Saaty. Ici les précipitations sont jugées deux fois supérieures à la pente et à la rivière, qui sont à égalité.
>
> Le moteur en déduit le vecteur propre : **50 % précipitations, 25 % chacun des deux autres**. Contrôle de cohérence : λmax = 3, ratio **0,00 %**, très en dessous du seuil de 10 %.
>
> **« Appliquer au modèle ETL »** enregistre ces poids dans `risk_model_weights`. C'est cette écriture qui pilote le calcul des rasters — les curseurs ne sont pas décoratifs.

**Question probable — « Deux familles de poids, pourquoi ? »**
> Le risque n'est pas l'aléa. L'aléa est le phénomène physique. Le risque intègre ce qui le transforme en dommage : vulnérabilité du sol et population présente.

**Question probable — « D'où viennent λmax et le CI ? »**
> Recalculés côté serveur à partir du ratio de cohérence renvoyé par le moteur, par `CI = CR × RI` puis `λmax = CI × (n−1) + n`.

#### Explorateur SOLAP (30 s)

> Le cube multidimensionnel, forgé sur le schéma en étoile.
>
> 22 zones, risque maximal absolu **89,85** (Analamanga, sécheresse), indice moyen national **36,81**, population cumulée **27 630 457,66**.
>
> Cinq profils d'aléas : cyclone 43,9 / max 67,8 ; sécheresse 51,6 / max 89,8 ; inondation 36,7 / max 85,0 ; risque global 12,5 / max 63,0 ; glissement 39,4 / max 66,5.
>
> Puis la matrice territoriale : une ligne par région, une colonne par aléa.

**Question probable — « 36,81 ici, 12,5 au tableau de bord ? »**
> Ce ne sont pas les mêmes indicateurs. 12,5 est la moyenne du **risque global composite** ; 36,81 la moyenne **tous aléas confondus**, tirée vers le haut par la sécheresse et le cyclone.

#### Analyse historique (15 s)

> Cinq séries sélectionnables. Pour le cyclone : pic 67,8, période octobre 2026, moyenne 43,9.
>
> **Une seule période.** L'entrepôt porte un instantané unique, celui de la dernière exécution du pipeline. Je ne présente pas cette page comme une profondeur historique.

---

### 3.6. Alertes — 1 min

> Quatre compteurs : **23 total, 23 actives, 1 critique, 0 résolue**.
>
> Quatre boutons en haut à droite :
>
> - **« Régions »** — maille d'analyse, aujourd'hui régionale seulement.
> - **« Actualiser »** — recharge la liste, sans recalcul.
> - **« Vérifier alertes »** — `generate-from-risk`. Lit les indicateurs zonaux, crée une alerte au-delà de 61, critique au-delà de 81. Met à jour au lieu de dupliquer.
> - **« Alertes opérationnelles »** — `generate-operational-alerts`. Part des 88 signaux, qui combinent risque de fond et météo du moment, et ne retient que les niveaux Élevé et Critique.
>
> **La différence est le cœur du module.** « Vérifier alertes » regarde le risque de fond ; « Alertes opérationnelles » regarde le risque de fond *pondéré par la météo du jour*.
>
> Chaque ligne porte le titre, la zone, la gravité, le risque maximal et sa moyenne, la population exposée, le statut, la date. Deux actions :
>
> - **« Résoudre »** — statut *Résolue*, horodatée, bascule dans *Historique*. Traitement effectif.
> - **« Ignorer »** — statut *Ignorée*, sans horodatage de résolution. Constatée, non traitée.

**Avant de commenter la liste**, appliquer le filtre **Critique** : le tri est chronologique, pas par gravité, et l'alerte d'Analamanga n'est pas en tête.

**Question probable — « 2 couples critiques, 1 alerte critique ? »**
> Le tableau de bord compte des risques, l'alerte compte des décisions. Analamanga dépasse 80 en sécheresse et en inondation. Mais l'alerte inondation intègre la météo : sans pluie elle ne se déclenche pas. Seule la sécheresse, renforcée par la chaleur, atteint la criticité.

**Question probable — « Je résous une alerte puis je relance la génération ? »**
> Elle est recréée. La résolution n'est pas définitive tant que le risque persiste — c'est voulu.

**Onglet « Signaux opérationnels » (si le temps le permet) :**
> 88 signaux, un par région et par aléa. Le signal existe même à niveau faible ; l'alerte, elle, n'est créée qu'au-dessus d'un seuil. D'où l'écart entre 88 et 23.

---

### 3.7. Données — 40 s

> Cette page pilote la chaîne d'alimentation. **7 sources sur 8** connectées, pipeline **READY**.
>
> - **« Lancer le pipeline de risque »** — exécution asynchrone. Le serveur renvoie un identifiant, l'interface interroge l'état toutes les deux secondes. Onze étapes : quatre rasters de risque, captures cartographiques, cinq calculs zonaux, reconstruction du schéma en étoile.
> - **« Synchroniser NASA POWER »** — paramètres climatiques sur les 22 régions, alimente le facteur météo des signaux.
> - **« Synchroniser GDACS (En Direct) »** — détection des cyclones actifs dans le sud-ouest de l'océan Indien.
> - **« Charger Cyclone Démo (Simulation) »** — injection d'un cyclone fictif. **Ne pas utiliser.**

**Ne pas montrer** l'onglet « Jobs ETL » : il est vide.

**Question probable — « IBTrACS en attente ? »**
> Archive statique, non flux permanent. Le fichier a servi à calculer l'indicateur cyclone — 1 565 valeurs, maximum 67,8. Pas de synchronisation périodique à afficher.

**Question probable — « Le pipeline fonctionne ? »**
> Oui, exécuté ce matin : 1 565 indicateurs zonaux, 7 825 lignes de faits, 19 couches raster. Je ne le relance pas devant vous : une exécution complète prend plusieurs dizaines de minutes.

---

### 3.8. Rapports — 40 s

> **Un rapport archivé** : le rapport national multi-risques, PDF, 162,5 Ko, généré le 31 octobre à 08:52.

*(télécharger le PDF)*

> Neuf pages : indicateurs zonaux, Top des zones, traçabilité ETL, cartographie. C'est le livrable institutionnel.
>
> Le **catalogue** propose sept exports : rapport national PDF, classeur Excel multi-feuilles, Top Zones en PDF (50 zones, fiche BNGRC) et en Excel (100 zones, analyse), export CSV du fait de risque, audit des sources, journal ETL.
>
> **« Générateur Sur-Mesure »** compose un rapport à la demande.

**Ne pas ouvrir** le comparateur de périodes : « 0 Régions », faute de profondeur temporelle.
**Ne pas télécharger** le journal ETL : vide.

**Question probable — « PDF et Excel Top Zones, doublon ? »**
> Non. Le PDF est une fiche de synthèse de 50 zones, faite pour être lue. L'Excel en couvre 100, avec les indicateurs détaillés. Même donnée, deux usages.

**Question probable — « Où sont stockés les rapports ? »**
> Stockage objet compatible S3, compartiment dédié. Génération côté serveur, dépôt, puis téléchargement. La base ne garde que les métadonnées.

---

## 4. Fiche des boutons

| Page | Bouton | Action réelle |
|---|---|---|
| Alertes | Régions | Maille d'analyse (régionale uniquement aujourd'hui) |
| Alertes | Actualiser | Recharge la liste, sans recalcul |
| Alertes | Vérifier alertes | `POST /alertes/generate-from-risk` — seuils 61 / 81 |
| Alertes | Alertes opérationnelles | `POST /alertes/generate-operational-alerts` — signaux Élevé et Critique |
| Alertes | Résoudre | Statut `RESOLUE` + horodatage |
| Alertes | Ignorer | Statut `IGNOREE`, sans horodatage |
| Signaux | Recalculer signaux | `POST /operational-signals/recompute` — réécrit les 88 lignes |
| Carte | Cyclone Démo | **À éviter** — cyclone fictif + alerte critique |
| AHP | Calculer les poids AHP | Appel FastAPI, repli moteur interne |
| AHP | Appliquer au modèle ETL | Écrit dans `risk_model_weights` |
| Données | Lancer le pipeline | 11 étapes, asynchrone, plusieurs dizaines de minutes |
| Données | Synchroniser GDACS | Détection cyclones actifs |
| Données | Charger Cyclone Démo | **À éviter** — simulation |
| Rapports | Générateur Sur-Mesure | Composition à la demande |

---

## 5. Questions probables

**« Pourquoi 12,5 au tableau de bord et 36,81 dans SOLAP ? »**
> Indicateurs différents : risque global composite contre moyenne tous aléas.

**« Pourquoi 2 critiques au tableau de bord et 1 alerte critique ? »**
> Le tableau compte des risques, l'alerte compte des décisions. La météo filtre.

**« Pourquoi le graphique n'a-t-il qu'un point ? »**
> L'entrepôt porte un instantané unique, celui de la dernière exécution. Le dispositif est conçu pour archiver plusieurs exécutions.

**« Les 27,63 millions, c'est la population en danger ? »**
> C'est la population des zones couvertes, sur l'ensemble du territoire. Une mesure d'exposition, pas de sinistres.

**« Comment est calculé le niveau de risque d'une zone ? »**
> À partir du risque **maximal**, pas de la moyenne. Classe : ≤ 30 faible, ≤ 60 moyen, ≤ 80 élevé, au-delà critique.

**« Pourquoi les alertes ne sont-elles pas triées par gravité ? »**
> Tri chronologique, qui privilégie la fraîcheur. Le filtre de gravité permet la lecture par criticité.

**« Combien de temps pour recalculer tout le territoire ? »**
> Le pipeline complet prend plusieurs dizaines de minutes. Je ne l'exécute pas devant vous.

**« Les données sont-elles à jour ? »**
> Référentiels géospatiaux synchronisés le 31 octobre à 07:04, météo OpenWeather toutes les heures, entrepôt reconstruit le 31 octobre.

---

## 6. Pièges à éviter

| Piège | Conséquence |
|---|---|
| Cliquer « Cyclone Démo » (carte ou Données) | Crée une alerte critique fictive « TC-SIMULATION-DEMO » |
| Lancer deux générations d'alertes en démonstration | Modifie les compteurs affichés |
| Ouvrir le comparateur de périodes | Affiche « 0 Régions » |
| Télécharger le journal ETL | Fichier vide |
| Montrer l'onglet Jobs ETL | Vide, contredit l'orchestration |
| Montrer la console MinIO (port 9001) | Identifiants par défaut visibles |
| Dire « veille GDACS 24/7 » | Bannière statique |
| Dire « rétrospective pluriannuelle » | Un seul point |
| Parler du camembert comme « 110 régions » | Ce sont 22 régions × 5 aléas |
| Affirmer CAPTCHA / 2FA / limitation de débit | Non implémentés |
| Commenter la superficie de 92 km² | Valeur douteuse |

---

## 7. Liste de contrôle avant de passer

- [ ] Backend démarré, frontend démarré, PostgreSQL sur le port 5433
- [ ] Microservice AHP actif (sinon l'interface affichera « Moteur interne Saaty » — non bloquant)
- [ ] Connexion testée avec le compte administrateur **juste avant**
- [ ] Page Alertes : filtre **Critique** appliqué, 1 ligne visible
- [ ] Compteurs cohérents : 23 total / 23 actives / 1 critique / 0 résolue
- [ ] Aucune alerte résiduelle « SIMULATION-DEMO » en base
- [ ] Sauvegarde `pg_dump` récente, copiée hors machine
- [ ] Onglets de navigateur fermés, sauf l'application
- [ ] Zoom navigateur à 100 %, plein écran
- [ ] Notifications système coupées

**Contrôle des alertes résiduelles :**

```bash
docker compose exec -T postgres-postgis psql -U geodecisionnel -d geodecisionnel -c "SELECT id, titre, status FROM alertes WHERE titre ILIKE '%DEMO%' OR titre ILIKE '%SIMULATION%';"
```

Résultat attendu : `0 rows`.

**Sauvegarde avant la soutenance :**

```bash
mkdir -p ~/backups && docker compose exec -T postgres-postgis pg_dump -U geodecisionnel -Fc geodecisionnel > ~/backups/geodecisionnel_SOUTENANCE_$(date +%Y%m%d_%H%M).dump && ls -lh ~/backups/ | tail -3
```

---

## 8. Plan de secours

**Le backend ne répond pas.**
> Redémarrer la pile, vérifier le port 5433. Si l'incident persiste : montrer les captures d'écran, le PDF national déjà téléchargé, et expliquer l'architecture sur le schéma.

**Le microservice AHP est absent.**
> L'interface bascule automatiquement sur le moteur Saaty interne. Les poids affichés sont identiques. Le dire simplement : « le moteur de secours est actif ».

**Un compteur semble incohérent.**
> Ne pas improviser. Répondre : « je vérifie la requête en fin de séance » et enchaîner.

**Question sans réponse.**
> « Ce point n'a pas été instrumenté dans le périmètre de cette version. Je le note comme perspective. » — une limite assumée est plus solide qu'une réponse inventée.

---

## 9. Clôture

> Le parcours s'achève : de la donnée satellitaire brute jusqu'au rapport transmissible à un décideur. Huit sources alimentent un entrepôt spatial, cinq modèles produisent des indicateurs sur 1 565 zones, et le système restitue cartes, alertes et rapports. La chaîne est complète et chaque étape est traçable.

---

*Document de conduite — ne pas joindre au mémoire.*
