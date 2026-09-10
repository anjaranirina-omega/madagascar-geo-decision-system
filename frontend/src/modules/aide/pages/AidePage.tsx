import React, { useMemo, useState } from 'react';
import {
  AlertTriangle,
  ArrowRight,
  BarChart3,
  BookOpen,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Cpu,
  Database,
  ExternalLink,
  FileText,
  Globe,
  HelpCircle,
  History,
  Info,
  Layers,
  LifeBuoy,
  Map,
  MapPin,
  RadioTower,
  Scale,
  Search,
  Shield,
  ShieldCheck,
  Sliders,
  SlidersHorizontal,
  Sparkles,
  Users,
  Waves,
  Zap,
} from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import PageHeader from '../../../shared/components/ui/PageHeader';
import Tabs from '../../../shared/components/ui/Tabs';

type HelpTab = 'overview' | 'modules' | 'methodology' | 'sources' | 'faq' | 'glossary';

const QUICK_STEPS = [
  {
    step: '01',
    title: 'Surveiller le Tableau de bord',
    description:
      'Consultez la météo temps réel des 22 régions, les alertes prioritaires et les séries temporelles consolidées.',
    path: '/dashboard',
    icon: BarChart3,
    color: 'from-blue-500 to-cyan-500',
  },
  {
    step: '02',
    title: 'Visualiser la Carte interactive (SIG)',
    description:
      'Superposez les rasters de risque global, inondation, cyclone, sécheresse et les 1 579 communes de Madagascar.',
    path: '/carte',
    icon: Map,
    color: 'from-emerald-500 to-teal-500',
  },
  {
    step: '03',
    title: 'Calibrer les modèles AHP & Explorer le SOLAP',
    description:
      'Ajustez les poids matriciels de Saaty, vérifiez la cohérence (CR < 10%) et forez le cube DWH (Drill-Down / Roll-Up).',
    path: '/analyse',
    icon: SlidersHorizontal,
    color: 'from-purple-500 to-indigo-500',
  },
  {
    step: '04',
    title: 'Piloter les Données & Générer les Rapports',
    description:
      'Exécutez le pipeline ETL de 20 étapes, synchronisez GDACS/NASA POWER et exportez les rapports décisionnels PDF/Excel.',
    path: '/rapports',
    icon: FileText,
    color: 'from-amber-500 to-orange-500',
  },
];

const PLATFORM_MODULES = [
  {
    title: 'Tableau de bord (Dashboard)',
    path: '/dashboard',
    icon: BarChart3,
    badge: 'Vue d’ensemble',
    description:
      'Centre de commandement unifié affichant les indicateurs clés (KPIs nationaux), la météo en direct sur les 22 régions, les alertes actives et l’état du dernier pipeline ETL.',
    features: [
      'Météo en direct via Open-Meteo & NASA POWER (température, vent, humidité)',
      'Distribution territoriale du risque sur 22 Régions, 119 Districts, 1579 Communes',
      'Flux d’alertes critiques en temps réel avec notifications toast',
    ],
  },
  {
    title: 'Carte interactive & SIG Raster',
    path: '/carte',
    icon: Map,
    badge: 'Cartographie',
    description:
      'Système SIG complet combinant Leaflet, Tuiles Raster Cloud-Optimized GeoTIFF (COG) et couches administratives vectorielles GeoJSON à haute précision.',
    features: [
      'Superposition des 5 modèles de risque (Global, Inondation, Cyclone, Sécheresse, Glissement)',
      'Point-and-Click spatial avec extraction immédiate des valeurs de pixel et statistiques zonales',
      'Suivi en direct des trajectoires cycloniques actives (GDACS / JTWC)',
    ],
  },
  {
    title: 'Modèle AHP Saaty & Décision',
    path: '/analyse',
    icon: SlidersHorizontal,
    badge: 'Aide à la décision',
    description:
      'Moteur d’analyse multicritère basé sur la méthode Analytic Hierarchy Process de Thomas Saaty. Permet la pondération par paires et le recalcul matriciel.',
    features: [
      'Validation mathématique du ratio de cohérence (CR < 0.10) via microservice Python FastAPI',
      'Presets calibrés par aléa et application directe au pipeline raster de l’ETL',
      'Piliers : Aléa climatique, Relief/Pente, Sensibilité environnementale, Exposition humaine',
    ],
  },
  {
    title: 'Explorateur SOLAP & Data Warehouse',
    path: '/analyse/solap',
    icon: Database,
    badge: 'Data Warehouse',
    description:
      'Exploration multidimensionnelle spatiale (Spatial OLAP) connectée aux tables de faits et dimensions DWH du système géodécisionnel.',
    features: [
      'Navigation hiérarchique avec Forage spatial (Drill-Down / Roll-Up) Région -> District -> Commune',
      'Matrice territoriale croisée comparant instantanément tous les aléas par zone',
      'Exportation directe des agrégations au format CSV',
    ],
  },
  {
    title: 'Analyse Historique & Chronologie',
    path: '/analyse/historique',
    icon: History,
    badge: 'Rétrospective',
    description:
      'Reconstitution pluriannuelle des événements climatiques passés, tendances d’évolution et pics d’exposition humaine enregistrés dans le Data Warehouse.',
    features: [
      '4 KPIs rétrospectifs : Pic historique (/100), Période critique, Moyenne pluriannuelle, Pop. max',
      'Sélecteur d’aléas en pilules interactives avec jauges de sévérité graduées',
      'Historique mensuel consolidé issu de dwh.fact_risk_indicator',
    ],
  },
  {
    title: 'Gestion des Données & Pipeline ETL',
    path: '/donnees',
    icon: Database,
    badge: 'Ingestion & ETL',
    description:
      'Orchestration des 20 étapes du pipeline de calcul de risque géospatialisé, synchronisation des flux externes et gestion des tables PostgreSQL/PostGIS.',
    features: [
      'Synchronisation directe NASA POWER API pour les bilans thermiques journaliers',
      'Interrogation continue du flux RSS GDACS Cyclones (Océan Indien Sud-Ouest)',
      'Suivi des jobs ETL asynchrones et traçabilité des exécutions',
    ],
  },
  {
    title: 'Génération & Comparaison des Rapports',
    path: '/rapports',
    icon: FileText,
    badge: 'Reporting officiel',
    description:
      'Module d’exportation documentaire officiel (BNGRC, ministères) avec comparateur multi-temporel et archivage GED.',
    features: [
      'Générateur sur-mesure d’exports PDF graphiques, classeurs Excel et fichiers CSV',
      'Bandeau de comparaison temporelle dynamique (Période A vs Période B) avec baselines intelligentes',
      'Archive électronique complète avec métriques de stockage MinIO',
    ],
  },
  {
    title: 'Gestion & Suivi des Alertes',
    path: '/alertes',
    icon: AlertTriangle,
    badge: 'Vigilance',
    description:
      'Système de détection automatique des zones à haut risque basé sur les seuils zonaux réels et signaux de terrain.',
    features: [
      'Tiroir d’analyse détaillée par zone avec répartition de la population exposée',
      'Filtrage multicritère par gravité (Critique, Élevé, Moyen, Faible) et par aléa',
      'Notifications WebSocket temps réel intégrées avec alertes sonores/visuelles',
    ],
  },
];

const DATA_SOURCES = [
  {
    name: 'CHIRPS v2.0 (UCSB Climate Hazards Group)',
    type: 'Précipitations & Pluviométrie',
    resolution: '0.05° (~5.5 km)',
    frequency: 'Penthadaire / Mensuel',
    description:
      'Combinaison d’imagerie satellitaire infrarouge et de stations de jaugeage terrestres pour la détection des pluies intenses et des déficits hydriques.',
  },
  {
    name: 'Copernicus DEM GLO-30 (ESA)',
    type: 'Modèle Numérique de Terrain (MNT / DEM)',
    resolution: '30 mètres',
    frequency: 'Statique de haute précision',
    description:
      'Fournit l’altitude et le gradient de pente topographique pour modéliser les zones de cuvette (inondations) et les pentes instables (glissements de terrain).',
  },
  {
    name: 'ESA WorldCover 10m',
    type: 'Occupation du sol & Vulnérabilité territoriale',
    resolution: '10 mètres',
    frequency: 'Annuel',
    description:
      'Cartographie mondiale d’occupation du sol distinguant zones bâties, terres agricoles, mangroves, forêts et sols nus pour évaluer la vulnérabilité.',
  },
  {
    name: 'WorldPop Madagascar',
    type: 'Densité de Population & Exposition humaine',
    resolution: '100 mètres',
    frequency: 'Recensement spatialisé calibré',
    description:
      'Estimation spatiale du nombre d’habitants par pixel de 100m, permettant de chiffrer précisément les populations vulnérables et exposées.',
  },
  {
    name: 'NASA POWER API',
    type: 'Climat & Température en temps réel',
    resolution: '0.5° x 0.5°',
    frequency: 'Quotidien (04h00 UTC)',
    description:
      'Relevés journaliers de température moyenne, maximale, minimale et rayonnement solaire pour modéliser les sécheresses et vagues de chaleur.',
  },
  {
    name: 'GDACS & IBTrACS NOAA',
    type: 'Cyclones Tropicaux & Trajectoires actives',
    resolution: 'Trajectoires vectorielles & tampons de vent',
    frequency: 'Temps réel (30 min) + Archive historique',
    description:
      'Flux d’alertes en direct pour les tempêtes dans le bassin Sud-Ouest de l’océan Indien et base séculaire NOAA pour la récurrence des cyclones à Madagascar.',
  },
  {
    name: 'HydroRIVERS & HydroSHEDS (WWF / USGS)',
    type: 'Réseau Hydrographique & Bassins versants',
    resolution: 'Vectoriel continu',
    frequency: 'Référence hydrologique',
    description:
      'Représentation numérique des cours d’eau de Madagascar pour calculer la distance euclidienne aux rivières dans le modèle inondation.',
  },
];

const SEVERITY_SCALE = [
  {
    range: '0 — 25',
    level: 'Faible',
    color: 'bg-emerald-500',
    textColor: 'text-emerald-700 dark:text-emerald-300',
    bgColor: 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800',
    description: 'Conditions normales ou exposition négligeable. Aucune mesure d’urgence requise.',
  },
  {
    range: '25 — 50',
    level: 'Modéré / Moyen',
    color: 'bg-amber-500',
    textColor: 'text-amber-700 dark:text-amber-300',
    bgColor: 'bg-amber-50 dark:bg-amber-950/40 border-amber-200 dark:border-amber-800',
    description: 'Vigilance standard. Conditions météorologiques ou environnementales nécessitant un suivi préventif.',
  },
  {
    range: '50 — 75',
    level: 'Élevé',
    color: 'bg-orange-500',
    textColor: 'text-orange-700 dark:text-orange-300',
    bgColor: 'bg-orange-50 dark:bg-orange-950/40 border-orange-200 dark:border-orange-800',
    description: 'Alerte significative. Risque important de perturbations, d’inondations locales ou de stress hydrique prononcé.',
  },
  {
    range: '75 — 100',
    level: 'Critique',
    color: 'bg-rose-500',
    textColor: 'text-rose-700 dark:text-rose-300',
    bgColor: 'bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-800',
    description: 'Danger imminent ou catastrophe majeure. Déclenchement immédiat des protocoles d’intervention et de secours (BNGRC).',
  },
];

const FAQ_ITEMS = [
  {
    q: 'Les indices de risque affichés sont-ils réels ou simulés ?',
    category: 'Méthodologie',
    a: 'Tous les calculs reposent exclusivement sur des données géophysiques et satellitaires réelles vérifiables : pluviométrie CHIRPS, relief Copernicus 30m, occupation du sol ESA 10m, population WorldPop et relevés journaliers NASA POWER.',
  },
  {
    q: 'Comment fonctionne la pondération AHP (Analytic Hierarchy Process) ?',
    category: 'AHP',
    a: 'La méthode AHP de Saaty structure le problème en matrices de comparaisons par paires (échelle 1 à 9). L’application calcule le vecteur propre principal pour déduire le poids de chaque critère, tout en vérifiant que le Ratio de Cohérence (CR = CI / RI) reste strictement inférieur à 10% (0.10).',
  },
  {
    q: 'Que signifient les opérations "Drill-Down" et "Roll-Up" dans l’Explorateur SOLAP ?',
    category: 'SOLAP',
    a: 'Le "Drill-Down" (forage vers le bas) permet de descendre d’un niveau hiérarchique supérieur (les 22 Régions) vers les 119 Districts ou les 1 579 Communes. Le "Roll-Up" agrège inversement les indicateurs locaux vers les totaux régionaux ou nationaux.',
  },
  {
    q: 'Comment sont déclenchées les alertes automatiques ?',
    category: 'Alertes',
    a: 'Le système analyse les statistiques zonales moyennes et maximales produites à chaque itération ETL. Si un seuil de risque critique (score > 60 ou > 75 selon l’aléa) est franchi sur une zone administrative, une alerte est automatiquement consignée et diffusée par WebSocket.',
  },
  {
    q: 'Pourquoi relancer le pipeline ETL depuis la page Données ?',
    category: 'Données',
    a: 'Le pipeline ETL exécute les 20 étapes d’ingestion, normalisation matricielle raster, zonal statistics et chargement DWH. Lorsque vous modifiez les pondérations AHP, lancer le pipeline permet de recalculer immédiatement les rasters finaux.',
  },
  {
    q: 'Quels formats d’exportation sont disponibles dans les Rapports ?',
    category: 'Rapports',
    a: 'Le module de rapports propose des documents PDF professionnels mis en page avec en-têtes officiels et graphiques, des classeurs Microsoft Excel (.xlsx) structurés pour les analystes de données, et des exports CSV universels.',
  },
];

const GLOSSARY_TERMS = [
  {
    term: 'AHP (Analytic Hierarchy Process)',
    def: 'Méthode d’aide à la décision multicritère développée par Thomas Saaty permettant de hiérarchiser des critères par comparaison matricielle par paires.',
  },
  {
    term: 'CR (Consistency Ratio / Ratio de Cohérence)',
    def: 'Indicateur statistique vérifiant la logique des jugements dans une matrice AHP. Un CR < 0.10 (10%) atteste d’une cohérence mathématique acceptable.',
  },
  {
    term: 'SOLAP (Spatial On-Line Analytical Processing)',
    def: 'Technologie d’analyse multidimensionnelle combinant les fonctionnalités OLAP (forage, agrégation) aux systèmes d’information géographique (SIG).',
  },
  {
    term: 'DWH (Data Warehouse / Entrepôt de Données)',
    def: 'Base de données relationnelle optimisée en schéma en étoile (tables de faits et dimensions) pour les requêtes décisionnelles volumineuses.',
  },
  {
    term: 'ETL (Extract, Transform, Load)',
    def: 'Chaîne automatisée qui extrait les données brutes (satellites, météo), les transforme (projection, normalisation, calcul matriciel) et les injecte dans la base.',
  },
  {
    term: 'COG (Cloud-Optimized GeoTIFF)',
    def: 'Format raster géospatial optimisé pour le streaming et le chargement par tuiles à travers le protocole HTTP sans télécharger l’intégralité du fichier.',
  },
  {
    term: 'RBAC (Role-Based Access Control)',
    def: 'Système de sécurité régissant les autorisations d’accès aux modules en fonction du rôle attribué à chaque utilisateur (Administrateur, Analyste, Décideur).',
  },
  {
    term: 'Zonal Statistics (Statistiques Zonales)',
    def: 'Opération spatiale calculant les valeurs moyennes, maximales, minimales et les sommes de pixels d’un raster à l’intérieur d’un polygone administratif.',
  },
];

export default function AidePage() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<HelpTab>('overview');
  const [searchQuery, setSearchQuery] = useState('');
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(0);

  const filteredFaq = useMemo(() => {
    if (!searchQuery.trim()) return FAQ_ITEMS;
    const q = searchQuery.toLowerCase();
    return FAQ_ITEMS.filter(
      (item) =>
        item.q.toLowerCase().includes(q) ||
        item.a.toLowerCase().includes(q) ||
        item.category.toLowerCase().includes(q),
    );
  }, [searchQuery]);

  const filteredGlossary = useMemo(() => {
    if (!searchQuery.trim()) return GLOSSARY_TERMS;
    const q = searchQuery.toLowerCase();
    return GLOSSARY_TERMS.filter(
      (item) => item.term.toLowerCase().includes(q) || item.def.toLowerCase().includes(q),
    );
  }, [searchQuery]);

  const filteredModules = useMemo(() => {
    if (!searchQuery.trim()) return PLATFORM_MODULES;
    const q = searchQuery.toLowerCase();
    return PLATFORM_MODULES.filter(
      (item) =>
        item.title.toLowerCase().includes(q) ||
        item.description.toLowerCase().includes(q) ||
        item.features.some((f) => f.toLowerCase().includes(q)),
    );
  }, [searchQuery]);

  return (
    <div className="space-y-6">
      {/* 1. Header Principal Standardisé */}
      <PageHeader
        title="Centre d'Aide & Guide Méthodologique"
        subtitle="Documentation complète, guide de prise en main, inventaire des sources satellitaires et méthodologie multicritère RISKCLIM-MG."
        icon={<HelpCircle size={32} className="text-emerald-400" />}
        actions={
          <div className="flex items-center gap-2">
            <div className="relative w-64 sm:w-72">
              <Search
                size={16}
                className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
              />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Rechercher (ex: AHP, CHIRPS, SOLAP)..."
                className="h-11 w-full rounded-xl border border-white/20 bg-white/10 pl-9 pr-3 text-xs font-bold text-white placeholder:text-slate-400 backdrop-blur outline-none focus:bg-white/20"
              />
            </div>
          </div>
        }
      />

      {/* 2. Onglets de navigation de la documentation */}
      <Tabs
        active={activeTab}
        onChange={(tab) => setActiveTab(tab as HelpTab)}
        tabs={[
          { id: 'overview', label: 'Prise en main' },
          { id: 'modules', label: 'Modules & Outils', count: PLATFORM_MODULES.length },
          { id: 'methodology', label: 'Méthodologie & Échelle AHP' },
          { id: 'sources', label: 'Sources de Données', count: DATA_SOURCES.length },
          { id: 'faq', label: 'Questions fréquentes (FAQ)', count: FAQ_ITEMS.length },
          { id: 'glossary', label: 'Glossaire SIG & DWH', count: GLOSSARY_TERMS.length },
        ]}
      />

      {/* 3. Contenu de l'onglet : Prise en main */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* 4 Étapes Clés */}
          <div>
            <div className="mb-4">
              <h3 className="text-lg font-black text-slate-900 dark:text-white">
                Flux de travail décisionnel en 4 étapes
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Comment exploiter la plateforme pour une prise de décision rapide et étayée.
              </p>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
              {QUICK_STEPS.map((step) => {
                const Icon = step.icon;
                return (
                  <div
                    key={step.step}
                    className="flex flex-col justify-between rounded-3xl border border-slate-200 bg-white p-5 shadow-xs dark:border-slate-800 dark:bg-slate-900"
                  >
                    <div>
                      <div className="flex items-center justify-between">
                        <div
                          className={`flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br ${step.color} text-white shadow-sm`}
                        >
                          <Icon size={20} />
                        </div>
                        <span className="text-xs font-black font-mono text-slate-400">
                          {step.step}
                        </span>
                      </div>

                      <h4 className="mt-4 text-sm font-black text-slate-900 dark:text-white">
                        {step.title}
                      </h4>

                      <p className="mt-2 text-xs leading-5 text-slate-500 dark:text-slate-400">
                        {step.description}
                      </p>
                    </div>

                    <div className="mt-5 pt-3 border-t border-slate-100 dark:border-slate-800">
                      <Link
                        to={step.path}
                        className="inline-flex items-center gap-1.5 text-xs font-black text-purple-600 hover:text-purple-700 dark:text-purple-400 dark:hover:text-purple-300"
                      >
                        <span>Accéder à l'outil</span>
                        <ArrowRight size={13} />
                      </Link>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Cadres Bonnes pratiques et Organisation */}
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-xs dark:border-slate-800 dark:bg-slate-900">
              <div className="mb-4 flex items-center gap-3">
                <div className="rounded-2xl bg-emerald-50 p-2.5 text-emerald-600 dark:bg-emerald-950/50 dark:text-emerald-300">
                  <CheckCircle2 size={22} />
                </div>
                <div>
                  <h4 className="text-base font-black text-slate-900 dark:text-white">
                    Bonnes pratiques d'exploitation
                  </h4>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Directives opérationnelles pour les analystes et décideurs.
                  </p>
                </div>
              </div>

              <div className="space-y-3 text-xs leading-5 text-slate-600 dark:text-slate-300">
                {[
                  'Vérifiez la date du dernier pipeline ETL et l’état des sources dans la page Données avant de publier un rapport.',
                  'Assurez-vous que le Ratio de Cohérence (CR) reste sous 10% lors du calibrage d’un nouveau modèle AHP.',
                  'Utilisez le comparateur multi-temporel pour mesurer l’impact réel d’un événement par rapport à la moyenne pluriannuelle.',
                  'Priorisez les interventions sur les communes combinant un indice de risque > 60 et une densité de population forte.',
                ].map((item, idx) => (
                  <div key={idx} className="flex items-start gap-2.5">
                    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-[11px] font-black text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300">
                      ✓
                    </span>
                    <span>{item}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-xs dark:border-slate-800 dark:bg-slate-900">
              <div className="mb-4 flex items-center gap-3">
                <div className="rounded-2xl bg-blue-50 p-2.5 text-blue-600 dark:bg-blue-950/50 dark:text-blue-300">
                  <LifeBuoy size={22} />
                </div>
                <div>
                  <h4 className="text-base font-black text-slate-900 dark:text-white">
                    Assistance technique & Support
                  </h4>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Contacts institutionnels et référents techniques.
                  </p>
                </div>
              </div>

              <div className="space-y-3 text-xs leading-5 text-slate-600 dark:text-slate-300">
                <p>
                  <strong className="text-slate-900 dark:text-white">Création et droits de compte :</strong> Adressez une demande via le formulaire public de contact administrateur ou contactez le superviseur du système.
                </p>
                <p>
                  <strong className="text-slate-900 dark:text-white">Anomalies de données ou recalcul :</strong> Vérifiez le journal des jobs dans la page <em>Gestion des données</em> ou relancez la synchronisation NASA POWER / GDACS.
                </p>
              </div>

              <div className="mt-4 rounded-2xl border border-blue-100 bg-blue-50 p-3.5 text-xs font-semibold text-blue-900 dark:border-blue-900/60 dark:bg-blue-950/40 dark:text-blue-200">
                ⚠️ <strong>Avertissement :</strong> RISKCLIM-MG est un système d’aide à la décision. Les alertes diffusées doivent être validées par les autorités officielles (BNGRC, Météo Madagascar) avant diffusion au grand public.
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 4. Contenu de l'onglet : Modules & Outils */}
      {activeTab === 'modules' && (
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
          {filteredModules.map((mod) => {
            const Icon = mod.icon;
            return (
              <div
                key={mod.title}
                className="flex flex-col justify-between rounded-3xl border border-slate-200 bg-white p-6 shadow-xs dark:border-slate-800 dark:bg-slate-900"
              >
                <div>
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-purple-50 text-purple-600 dark:bg-purple-950/50 dark:text-purple-300">
                        <Icon size={24} />
                      </div>
                      <div>
                        <h4 className="text-base font-black text-slate-900 dark:text-white">
                          {mod.title}
                        </h4>
                        <span className="inline-block rounded-lg bg-slate-100 px-2 py-0.5 text-[11px] font-bold text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                          {mod.badge}
                        </span>
                      </div>
                    </div>
                  </div>

                  <p className="mt-4 text-xs leading-6 text-slate-600 dark:text-slate-300 font-medium">
                    {mod.description}
                  </p>

                  <div className="mt-4 space-y-2 rounded-2xl bg-slate-50 p-3.5 dark:bg-slate-950">
                    <span className="text-[11px] font-black uppercase tracking-wider text-slate-400">
                      Fonctionnalités clés :
                    </span>
                    {mod.features.map((feat, i) => (
                      <div key={i} className="flex items-start gap-2 text-xs text-slate-700 dark:text-slate-300">
                        <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-purple-500" />
                        <span>{feat}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="mt-5 pt-4 border-t border-slate-100 dark:border-slate-800 flex justify-end">
                  <Link
                    to={mod.path}
                    className="inline-flex items-center gap-2 rounded-xl bg-purple-50 px-3.5 py-2 text-xs font-black text-purple-700 transition hover:bg-purple-100 dark:bg-purple-950/50 dark:text-purple-300 dark:hover:bg-purple-900/60"
                  >
                    <span>Ouvrir {mod.title.split('(')[0]}</span>
                    <ArrowRight size={14} />
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* 5. Contenu de l'onglet : Méthodologie & Échelle AHP */}
      {activeTab === 'methodology' && (
        <div className="space-y-6">
          {/* Échelle d'interprétation 0 - 100 */}
          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-xs dark:border-slate-800 dark:bg-slate-900">
            <div className="mb-5">
              <h3 className="text-base font-black text-slate-900 dark:text-white">
                Grille Standardisée de Sévérité du Risque (Score 0 à 100)
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Tous les indices raster et zonaux sont normalisés sur une échelle continue de 0 à 100.
              </p>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {SEVERITY_SCALE.map((s) => (
                <div
                  key={s.range}
                  className={`rounded-2xl border p-4 ${s.bgColor}`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black font-mono">{s.range}</span>
                    <span className={`rounded-lg px-2 py-0.5 text-xs font-black ${s.textColor}`}>
                      {s.level}
                    </span>
                  </div>
                  <div className="mt-2 h-2 w-full rounded-full bg-white/60 dark:bg-black/30 overflow-hidden">
                    <div className={`h-full rounded-full ${s.color} w-full`} />
                  </div>
                  <p className="mt-3 text-xs leading-5 text-slate-600 dark:text-slate-300">
                    {s.description}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* Formules AHP et Saaty */}
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-xs dark:border-slate-800 dark:bg-slate-900">
              <div className="mb-3 flex items-center gap-3">
                <div className="rounded-2xl bg-purple-50 p-2.5 text-purple-600 dark:bg-purple-950/50 dark:text-purple-300">
                  <Scale size={22} />
                </div>
                <h4 className="text-base font-black text-slate-900 dark:text-white">
                  Formule Mathématique AHP (Saaty)
                </h4>
              </div>

              <p className="text-xs text-slate-600 dark:text-slate-300 leading-6">
                Le modèle hiérarchique calcule le vecteur propre de priorité $W = (w_1, w_2, ..., w_n)$ à partir de la matrice de jugement réciproque $A$ :
              </p>

              <div className="my-3 rounded-2xl bg-slate-50 p-4 font-mono text-xs font-bold text-slate-800 dark:bg-slate-950 dark:text-slate-200">
                A · W = λ_max · W
              </div>

              <p className="text-xs text-slate-600 dark:text-slate-300 leading-6">
                L’Indice de Cohérence ($CI$) et le Ratio de Cohérence ($CR$) sont calculés via :
              </p>

              <div className="my-3 rounded-2xl bg-slate-50 p-4 font-mono text-xs font-bold text-slate-800 dark:bg-slate-950 dark:text-slate-200">
                CI = (λ_max - n) / (n - 1)
                <br />
                CR = CI / RI &lt; 0.10 (Seuil de cohérence de 10%)
              </div>
            </div>

            <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-xs dark:border-slate-800 dark:bg-slate-900">
              <div className="mb-3 flex items-center gap-3">
                <div className="rounded-2xl bg-blue-50 p-2.5 text-blue-600 dark:bg-blue-950/50 dark:text-blue-300">
                  <Layers size={22} />
                </div>
                <h4 className="text-base font-black text-slate-900 dark:text-white">
                  Les 4 Piliers du Risque Composite
                </h4>
              </div>

              <div className="space-y-3">
                {[
                  { title: '1. Aléa (Hazard)', desc: 'Intensité physique mesurée (pluviométrie millimétrique CHIRPS, rafales de vent IBTrACS).' },
                  { title: '2. Topographie & Terrain', desc: 'Facteurs géomorphologiques aggravants (pente inversée pour crues, pente forte pour glissements).' },
                  { title: '3. Sensibilité Environnementale', desc: 'Type d’occupation du sol (zones déboisées, mangroves de protection, zones urbanisées imperméabilisées).' },
                  { title: '4. Exposition Humaine', desc: 'Densité de population et infrastructures vitales situées dans le rayon d’impact (WorldPop).' },
                ].map((p, i) => (
                  <div key={i} className="rounded-xl border border-slate-100 bg-slate-50/70 p-3 text-xs dark:border-slate-800 dark:bg-slate-950/50">
                    <span className="font-black text-slate-900 dark:text-white">{p.title} : </span>
                    <span className="text-slate-600 dark:text-slate-400">{p.desc}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 6. Contenu de l'onglet : Sources de Données Réelles */}
      {activeTab === 'sources' && (
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
          {DATA_SOURCES.map((src) => (
            <div
              key={src.name}
              className="flex flex-col justify-between rounded-3xl border border-slate-200 bg-white p-6 shadow-xs dark:border-slate-800 dark:bg-slate-900"
            >
              <div>
                <div className="flex items-center justify-between">
                  <span className="rounded-lg bg-emerald-50 px-2.5 py-1 text-[11px] font-black text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300">
                    {src.type}
                  </span>
                  <span className="text-[11px] font-mono font-bold text-slate-400">
                    {src.frequency}
                  </span>
                </div>

                <h4 className="mt-3 text-sm font-black text-slate-900 dark:text-white">
                  {src.name}
                </h4>

                <p className="mt-2 text-xs leading-5 text-slate-600 dark:text-slate-300 font-medium">
                  {src.description}
                </p>
              </div>

              <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-[11px] font-bold text-slate-500">
                <span>Résolution spatiale :</span>
                <span className="font-mono text-purple-600 dark:text-purple-400 font-black">{src.resolution}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 7. Contenu de l'onglet : FAQ */}
      {activeTab === 'faq' && (
        <div className="space-y-4">
          {filteredFaq.map((item, index) => {
            const isOpen = openFaqIndex === index;
            return (
              <div
                key={item.q}
                className="overflow-hidden rounded-2xl border border-slate-200 bg-white transition shadow-xs dark:border-slate-800 dark:bg-slate-900"
              >
                <button
                  type="button"
                  onClick={() => setOpenFaqIndex(isOpen ? null : index)}
                  className="flex w-full items-center justify-between gap-4 p-5 text-left text-sm font-black text-slate-900 transition hover:bg-slate-50 dark:text-white dark:hover:bg-slate-950"
                >
                  <div className="flex items-center gap-3">
                    <span className="rounded-lg bg-purple-50 px-2.5 py-1 text-[11px] font-black text-purple-700 dark:bg-purple-950/50 dark:text-purple-300">
                      {item.category}
                    </span>
                    <span>{item.q}</span>
                  </div>
                  {isOpen ? (
                    <ChevronUp size={18} className="text-purple-600" />
                  ) : (
                    <ChevronDown size={18} className="text-slate-400" />
                  )}
                </button>

                {isOpen && (
                  <div className="border-t border-slate-100 bg-slate-50/50 p-5 text-xs leading-6 text-slate-600 dark:border-slate-800 dark:bg-slate-950/60 dark:text-slate-300">
                    {item.a}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* 8. Contenu de l'onglet : Glossaire */}
      {activeTab === 'glossary' && (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {filteredGlossary.map((g) => (
            <div
              key={g.term}
              className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs dark:border-slate-800 dark:bg-slate-900"
            >
              <h4 className="text-xs font-black text-purple-700 dark:text-purple-400 font-mono">
                {g.term}
              </h4>
              <p className="mt-2 text-xs leading-5 text-slate-600 dark:text-slate-300">
                {g.def}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

