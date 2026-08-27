import {
  Activity,
  AlertTriangle,
  ArrowRight,
  BarChart3,
  Bell,
  CloudRain,
  Database,
  FileText,
  Leaf,
  Lock,
  Map,
  MapPin,
  RefreshCw,
  ShieldCheck,
  Sun,
  Users,
  Waves,
  Zap,
} from 'lucide-react';
import { Link } from 'react-router-dom';

function LogoMark() {
  return (
    <Link to="/" className="flex items-center gap-3" aria-label="Accueil RISKCLIM-MG">
      <div className="relative flex h-11 w-11 items-center justify-center text-white">
        <CloudRain size={38} strokeWidth={2.2} />
        <Leaf
          size={23}
          strokeWidth={2.4}
          className="absolute bottom-0 right-0 text-green-400"
        />
      </div>

      <div className="text-xl font-black tracking-tight">
        <span className="text-white">RISK</span>
        <span className="text-blue-400">CLIM</span>
        <span className="text-green-400">-MG</span>
      </div>
    </Link>
  );
}

const stats = [
  {
    value: '1 565',
    label: 'Zones administratives',
    detail: '22 régions, 110 districts, 1 433 communes',
    icon: <MapPin size={25} />,
    tone: 'from-blue-600 to-blue-500',
  },
  {
    value: '5',
    label: 'Risques suivis',
    detail: 'Global, inondation, sécheresse, glissement, cyclone',
    icon: <AlertTriangle size={25} />,
    tone: 'from-green-600 to-emerald-500',
  },
  {
    value: '8',
    label: 'Sources principales',
    detail: 'Climatiques, spatiales et socio-économiques',
    icon: <Database size={25} />,
    tone: 'from-indigo-600 to-blue-500',
  },
  {
    value: 'DWH',
    label: 'Analyse décisionnelle',
    detail: 'Data warehouse, SOLAP, indicateurs et rapports',
    icon: <BarChart3 size={25} />,
    tone: 'from-emerald-600 to-green-500',
  },
];

const risks = [
  {
    title: 'Inondation',
    description:
      'Analyse des zones exposées aux fortes précipitations, à la proximité hydrographique et aux faibles pentes.',
    badge: 'Risque hydrologique',
    icon: <Waves size={25} />,
    accent: 'blue',
  },
  {
    title: 'Sécheresse',
    description:
      'Suivi du déficit pluviométrique, du stress thermique et de la sensibilité de l’occupation du sol.',
    badge: 'Risque climatique',
    icon: <Sun size={25} />,
    accent: 'amber',
  },
  {
    title: 'Cyclone',
    description:
      'Analyse de l’exposition cyclonique à partir des trajectoires historiques, de la pluie et de l’exposition territoriale.',
    badge: 'Risque côtier',
    icon: <Zap size={25} />,
    accent: 'purple',
  },
  {
    title: 'Glissement de terrain',
    description:
      'Identification des zones sensibles selon la pente, les précipitations et les caractéristiques d’occupation du sol.',
    badge: 'Risque géomorphologique',
    icon: <AlertTriangle size={25} />,
    accent: 'green',
  },
];

const capabilities = [
  {
    title: 'Cartographie intelligente',
    description:
      'Visualisation interactive des couches raster de risque et des limites administratives de Madagascar.',
    icon: <Map size={26} />,
  },
  {
    title: 'Analyse multicritère',
    description:
      'Combinaison pondérée de critères climatiques, physiques et socio-économiques pour produire des indices de risque.',
    icon: <Activity size={26} />,
  },
  {
    title: 'Données climatiques',
    description:
      'Intégration de sources comme CHIRPS, NASA POWER et OpenWeather pour alimenter les indicateurs.',
    icon: <CloudRain size={26} />,
  },
  {
    title: 'Alertes opérationnelles',
    description:
      'Détection des zones sensibles à partir des indicateurs zonaux, des seuils de risque et des signaux récents.',
    icon: <Bell size={26} />,
  },
  {
    title: 'Rapports décisionnels',
    description:
      'Export de synthèses en PDF, Excel et CSV pour appuyer la communication et la prise de décision.',
    icon: <FileText size={26} />,
  },
];

const workflow = [
  {
    step: '1',
    title: 'Données',
    description:
      'Sources climatiques, rasters, données territoriales, population et observations météo.',
    icon: <Database size={28} />,
  },
  {
    step: '2',
    title: 'ETL',
    description:
      'Téléchargement, nettoyage, alignement raster, masquage Madagascar et chargement en base.',
    icon: <RefreshCw size={28} />,
  },
  {
    step: '3',
    title: 'Analyse',
    description:
      'Calcul multicritère par somme pondérée, statistiques zonales et construction du DWH.',
    icon: <Activity size={28} />,
  },
  {
    step: '4',
    title: 'Résultats',
    description:
      'Cartes de risques, indicateurs, tableaux de bord, séries temporelles et rapports.',
    icon: <BarChart3 size={28} />,
  },
  {
    step: '5',
    title: 'Décision',
    description:
      'Lecture synthétique des zones prioritaires, alertes et appui aux actions opérationnelles.',
    icon: <ShieldCheck size={28} />,
  },
];

const audiences = [
  {
    title: 'Décideurs',
    description:
      'Accèdent à une vision synthétique des risques et aux indicateurs nécessaires à la décision.',
    icon: <ShieldCheck size={26} />,
  },
  {
    title: 'Analystes',
    description:
      'Explorent les données, ajustent les modèles et interprètent les indicateurs territoriaux.',
    icon: <BarChart3 size={26} />,
  },
  {
    title: 'Agents de terrain',
    description:
      'Consultent les informations utiles sur les zones à surveiller et les signaux opérationnels.',
    icon: <MapPin size={26} />,
  },
  {
    title: 'Administrateurs',
    description:
      'Gèrent les utilisateurs, les paramètres, les sources et la qualité opérationnelle du système.',
    icon: <Users size={26} />,
  },
];

function accentClasses(accent: string) {
  switch (accent) {
    case 'blue':
      return {
        icon: 'from-blue-600 to-sky-500',
        badge: 'bg-blue-500/15 text-blue-200 border-blue-400/30',
      };
    case 'amber':
      return {
        icon: 'from-amber-500 to-orange-500',
        badge: 'bg-amber-500/15 text-amber-200 border-amber-400/30',
      };
    case 'purple':
      return {
        icon: 'from-purple-600 to-indigo-500',
        badge: 'bg-purple-500/15 text-purple-200 border-purple-400/30',
      };
    default:
      return {
        icon: 'from-green-600 to-emerald-500',
        badge: 'bg-green-500/15 text-green-200 border-green-400/30',
      };
  }
}

export default function HomePage() {
  return (
    <main className="min-h-screen overflow-hidden bg-slate-950 text-white">
      <section className="relative min-h-screen">
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{
            backgroundImage: "url(https://earthobservatory.nasa.gov/images/large/30773_madagascar-dust.jpg)",
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-br from-slate-950 via-slate-950/88 to-slate-950/40" />
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/50 to-transparent" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_18%_18%,rgba(34,197,94,0.20),transparent_26%),radial-gradient(circle_at_72%_18%,rgba(59,130,246,0.24),transparent_32%),radial-gradient(circle_at_82%_70%,rgba(14,165,233,0.13),transparent_30%)]" />

        <header className="relative z-20 mx-auto flex max-w-7xl items-center justify-between px-5 py-5 sm:px-8 lg:px-10">
          <LogoMark />

          <nav className="hidden items-center gap-8 text-sm font-semibold text-slate-200 lg:flex">
            <a className="text-green-300" href="#accueil">Accueil</a>
            <a className="transition hover:text-green-300" href="#objectifs">À propos</a>
            <a className="transition hover:text-green-300" href="#fonctionnalites">Fonctionnalités</a>
            <a className="transition hover:text-green-300" href="#fonctionnement">Fonctionnement</a>
            <a className="transition hover:text-green-300" href="#utilisateurs">Utilisateurs</a>
          </nav>

          <Link
            to="/login"
            className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-green-500 to-blue-600 px-4 text-sm font-extrabold text-white shadow-lg shadow-blue-950/30 transition hover:scale-[1.02] hover:shadow-xl"
          >
            <Lock size={17} />
            <span className="hidden sm:inline">Se connecter</span>
          </Link>
        </header>

        <div id="accueil" className="relative z-10 mx-auto max-w-7xl px-5 pb-10 pt-12 sm:px-8 lg:px-10 lg:pt-16">
          <div className="grid items-center gap-12 lg:grid-cols-[1.05fr_0.95fr]">
            <div>
              <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-green-400/25 bg-green-400/10 px-4 py-2 text-sm font-bold text-green-200 backdrop-blur">
                <span className="h-2 w-2 rounded-full bg-green-400" />
                Système géodécisionnel climatique pour Madagascar
              </div>

              <h1 className="max-w-3xl text-4xl font-black leading-tight tracking-tight sm:text-5xl lg:text-6xl">
                Anticiper aujourd’hui,
                <br />
                <span className="text-green-400">protéger</span> demain.
              </h1>

              <p className="mt-7 max-w-2xl text-base font-medium leading-8 text-slate-200 sm:text-lg">
                RISKCLIM-MG intègre les données climatiques, géospatiales et
                socio-économiques pour analyser les risques, produire des
                indicateurs territoriaux, générer des alertes et appuyer les
                décisions pour un territoire plus résilient.
              </p>

              <div className="mt-9 flex flex-col gap-4 sm:flex-row">
                <Link
                  to="/login"
                  className="inline-flex h-13 items-center justify-center gap-3 rounded-xl bg-gradient-to-r from-green-500 to-blue-600 px-6 py-4 text-sm font-extrabold text-white shadow-xl shadow-blue-950/30 transition hover:scale-[1.02]"
                >
                  Accéder à la plateforme
                  <ArrowRight size={19} />
                </Link>

                <a
                  href="#fonctionnement"
                  className="inline-flex h-13 items-center justify-center gap-3 rounded-xl border border-white/25 bg-white/10 px-6 py-4 text-sm font-extrabold text-white backdrop-blur transition hover:bg-white/15"
                >
                  Découvrir le système
                  <ArrowRight size={19} />
                </a>
              </div>
            </div>

            <div className="relative hidden min-h-[470px] lg:block">
              <div className="absolute right-6 top-4 w-72 rounded-3xl border border-white/15 bg-slate-950/45 p-5 shadow-2xl shadow-black/30 backdrop-blur-md">
                <div className="flex items-center gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-500/20 text-blue-300">
                    <CloudRain size={27} />
                  </div>
                  <div>
                    <div className="font-black">Données climatiques</div>
                    <div className="text-sm text-slate-300">CHIRPS, NASA POWER, OpenWeather</div>
                  </div>
                </div>
              </div>

              <div className="absolute left-6 top-4 w-72 rounded-3xl border border-white/15 bg-slate-950/45 p-5 shadow-2xl shadow-black/30 backdrop-blur-md">
                <div className="flex items-center gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-green-500/20 text-green-300">
                    <Map size={27} />
                  </div>
                  <div>
                    <div className="font-black">Territoire malgache</div>
                    <div className="text-sm text-slate-300">Régions, districts et communes</div>
                  </div>
                </div>
              </div>

              <div className="absolute bottom-6 left-6 w-80 rounded-3xl border border-white/15 bg-slate-950/45 p-5 shadow-2xl shadow-black/30 backdrop-blur-md">
                <div className="flex items-center gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-500/20 text-emerald-300">
                    <ShieldCheck size={27} />
                  </div>
                  <div>
                    <div className="font-black">Aide à la décision</div>
                    <div className="text-sm text-slate-300">Alertes, rapports et indicateurs SOLAP</div>
                  </div>
                </div>
              </div>

              <div className="absolute left-1/2 top-1/2 h-80 w-80 -translate-x-1/2 -translate-y-1/2 rounded-full border border-blue-400/20 bg-blue-500/10 blur-2xl" />
              <div className="absolute left-1/2 top-1/2 flex h-72 w-72 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border border-white/10 bg-slate-950/25 shadow-2xl backdrop-blur-sm">
                <div className="text-center">
                  <MapPin className="mx-auto mb-4 text-green-400" size={72} />
                  <div className="text-3xl font-black">Madagascar</div>
                  <div className="mt-2 text-sm font-semibold text-slate-300">
                    Analyse géospatiale multi-risques
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-14 grid gap-4 rounded-[2rem] border border-white/10 bg-slate-950/55 p-4 shadow-2xl shadow-black/25 backdrop-blur-md sm:grid-cols-2 lg:grid-cols-4">
            {stats.map((item) => (
              <div key={item.label} className="flex gap-4 rounded-3xl p-3">
                <div className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br ${item.tone} text-white shadow-lg`}>
                  {item.icon}
                </div>
                <div>
                  <div className="text-3xl font-black">{item.value}</div>
                  <div className="mt-1 text-sm font-extrabold text-white">{item.label}</div>
                  <div className="mt-1 text-xs leading-5 text-slate-300">{item.detail}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="objectifs" className="relative border-t border-white/10 bg-slate-950 px-5 py-16 sm:px-8 lg:px-10">
        <div className="mx-auto grid max-w-7xl gap-10 lg:grid-cols-[260px_1fr]">
          <div>
            <div className="h-1 w-16 rounded-full bg-gradient-to-r from-green-400 to-blue-500" />
            <h2 className="mt-5 text-3xl font-black tracking-tight">
              Comprendre les risques
            </h2>
            <p className="mt-4 leading-7 text-slate-300">
              La plateforme suit les principaux aléas climatiques et territoriaux
              qui menacent les populations et les infrastructures à Madagascar.
            </p>
          </div>

          <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
            {risks.map((risk) => {
              const classes = accentClasses(risk.accent);

              return (
                <article
                  key={risk.title}
                  className="group overflow-hidden rounded-[1.7rem] border border-white/10 bg-white/[0.06] p-5 shadow-xl shadow-black/15 backdrop-blur transition hover:-translate-y-1 hover:border-green-400/30 hover:bg-white/[0.08]"
                >
                  <div className={`mb-12 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br ${classes.icon} text-white shadow-lg`}>
                    {risk.icon}
                  </div>
                  <h3 className="text-xl font-black">{risk.title}</h3>
                  <p className="mt-3 min-h-[96px] text-sm leading-6 text-slate-300">
                    {risk.description}
                  </p>
                  <span className={`mt-4 inline-flex rounded-full border px-3 py-1 text-xs font-extrabold ${classes.badge}`}>
                    {risk.badge}
                  </span>
                </article>
              );
            })}
          </div>
        </div>
      </section>

      <section id="fonctionnalites" className="relative border-t border-white/10 bg-[#03111f] px-5 py-16 sm:px-8 lg:px-10">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(34,197,94,0.10),transparent_28%),radial-gradient(circle_at_80%_50%,rgba(59,130,246,0.13),transparent_34%)]" />

        <div className="relative mx-auto max-w-7xl">
          <div className="mb-9 max-w-3xl">
            <div className="h-1 w-16 rounded-full bg-gradient-to-r from-green-400 to-blue-500" />
            <h2 className="mt-5 text-3xl font-black tracking-tight">
              Une plateforme, plusieurs capacités
            </h2>
            <p className="mt-4 leading-7 text-slate-300">
              RISKCLIM-MG transforme les données brutes en informations
              compréhensibles, cartographiées et exploitables pour l’action.
            </p>
          </div>

          <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-5">
            {capabilities.map((capability) => (
              <article
                key={capability.title}
                className="rounded-[1.7rem] border border-white/10 bg-slate-950/55 p-5 shadow-xl shadow-black/20 backdrop-blur transition hover:-translate-y-1 hover:border-blue-400/30"
              >
                <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-600 to-green-500 text-white">
                  {capability.icon}
                </div>
                <h3 className="text-lg font-black">{capability.title}</h3>
                <p className="mt-3 text-sm leading-6 text-slate-300">
                  {capability.description}
                </p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section id="fonctionnement" className="border-t border-white/10 bg-slate-950 px-5 py-16 sm:px-8 lg:px-10">
        <div className="mx-auto max-w-7xl">
          <div className="mb-10 max-w-3xl">
            <div className="h-1 w-16 rounded-full bg-gradient-to-r from-green-400 to-blue-500" />
            <h2 className="mt-5 text-3xl font-black tracking-tight">
              Comment fonctionne RISKCLIM-MG ?
            </h2>
            <p className="mt-4 leading-7 text-slate-300">
              Le système suit une chaîne complète allant de la donnée brute à la
              décision : collecte, traitement, analyse, restitution et action.
            </p>
          </div>

          <div className="grid gap-5 lg:grid-cols-5">
            {workflow.map((item, index) => (
              <article key={item.title} className="relative rounded-[1.7rem] border border-white/10 bg-white/[0.06] p-5 shadow-xl shadow-black/15">
                {index < workflow.length - 1 && (
                  <div className="absolute -right-4 top-10 hidden h-px w-8 bg-gradient-to-r from-green-400/50 to-blue-400/50 lg:block" />
                )}
                <div className="mb-5 flex items-center gap-3">
                  <div className="flex h-13 w-13 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-600 to-green-500 text-white">
                    {item.icon}
                  </div>
                  <div className="text-sm font-black uppercase tracking-wide text-green-300">
                    {item.step}. {item.title}
                  </div>
                </div>
                <p className="text-sm leading-6 text-slate-300">{item.description}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section id="utilisateurs" className="border-t border-white/10 bg-[#03111f] px-5 py-16 sm:px-8 lg:px-10">
        <div className="mx-auto grid max-w-7xl gap-10 lg:grid-cols-[260px_1fr]">
          <div>
            <div className="h-1 w-16 rounded-full bg-gradient-to-r from-green-400 to-blue-500" />
            <h2 className="mt-5 text-3xl font-black tracking-tight">Pour qui ?</h2>
            <p className="mt-4 leading-7 text-slate-300">
              Une solution adaptée aux acteurs qui suivent, analysent et pilotent
              la gestion des risques climatiques.
            </p>
          </div>

          <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
            {audiences.map((audience) => (
              <article key={audience.title} className="rounded-[1.7rem] border border-white/10 bg-slate-950/55 p-5 shadow-xl shadow-black/20 backdrop-blur">
                <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-600 to-green-500 text-white">
                  {audience.icon}
                </div>
                <h3 className="text-lg font-black">{audience.title}</h3>
                <p className="mt-3 text-sm leading-6 text-slate-300">
                  {audience.description}
                </p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="border-t border-white/10 bg-slate-950 px-5 py-12 sm:px-8 lg:px-10">
        <div className="mx-auto max-w-7xl overflow-hidden rounded-[2rem] border border-white/10 bg-gradient-to-r from-green-600/25 via-blue-600/25 to-slate-900 p-8 shadow-2xl shadow-black/25 md:flex md:items-center md:justify-between md:gap-8">
          <div>
            <h2 className="text-2xl font-black tracking-tight sm:text-3xl">
              Transformez les données climatiques en décisions éclairées.
            </h2>
            <p className="mt-3 max-w-3xl leading-7 text-slate-200">
              Accédez à la plateforme sécurisée pour consulter les cartes de
              risques, les indicateurs, les alertes et les rapports décisionnels.
            </p>
          </div>

          <Link
            to="/login"
            className="mt-6 inline-flex h-12 shrink-0 items-center justify-center gap-3 rounded-xl bg-gradient-to-r from-green-500 to-blue-600 px-6 text-sm font-extrabold text-white shadow-xl shadow-blue-950/30 transition hover:scale-[1.02] md:mt-0"
          >
            Accéder à la plateforme
            <ArrowRight size={19} />
          </Link>
        </div>
      </section>

      <footer className="border-t border-white/10 bg-[#020b14] px-5 py-10 sm:px-8 lg:px-10">
        <div className="mx-auto grid max-w-7xl gap-8 md:grid-cols-[1.2fr_0.8fr_0.8fr_1fr]">
          <div>
            <LogoMark />
            <p className="mt-4 max-w-sm text-sm leading-6 text-slate-400">
              Système d’aide à la décision climatique géospatialisé pour
              l’analyse des risques à Madagascar.
            </p>
          </div>

          <div>
            <h3 className="font-black">Navigation</h3>
            <div className="mt-4 space-y-2 text-sm text-slate-400">
              <a className="block hover:text-green-300" href="#accueil">Accueil</a>
              <a className="block hover:text-green-300" href="#objectifs">À propos</a>
              <a className="block hover:text-green-300" href="#fonctionnalites">Fonctionnalités</a>
              <a className="block hover:text-green-300" href="#fonctionnement">Fonctionnement</a>
            </div>
          </div>

          <div>
            <h3 className="font-black">Plateforme</h3>
            <div className="mt-4 space-y-2 text-sm text-slate-400">
              <Link className="block hover:text-green-300" to="/login">Connexion</Link>
              <Link className="block hover:text-green-300" to="/login">Tableau de bord</Link>
              <Link className="block hover:text-green-300" to="/login">Carte des risques</Link>
              <Link className="block hover:text-green-300" to="/login">Rapports</Link>
            </div>
          </div>

          <div>
            <h3 className="font-black">Contact</h3>
            <div className="mt-4 space-y-2 text-sm text-slate-400">
              <div>contact@riskclim-mg.mg</div>
              <div>Antananarivo, Madagascar</div>
              <div className="flex items-center gap-2 pt-2 text-green-300">
                <ShieldCheck size={17} />
                Plateforme sécurisée
              </div>
            </div>
          </div>
        </div>

        <div className="mx-auto mt-8 flex max-w-7xl flex-col justify-between gap-3 border-t border-white/10 pt-6 text-sm text-slate-500 md:flex-row">
          <span>© 2026 RISKCLIM-MG • Tous droits réservés</span>
          <span>Système géodécisionnel climatique et spatial</span>
        </div>
      </footer>
    </main>
  );
}
