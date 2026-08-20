import {
  AlertTriangle,
  BarChart3,
  BookOpen,
  CheckCircle2,
  Database,
  FileText,
  HelpCircle,
  Layers,
  LifeBuoy,
  Map,
  RadioTower,
  ShieldCheck,
  SlidersHorizontal,
} from 'lucide-react';

const quickSteps = [
  {
    title: '1. Consulter le tableau de bord',
    description:
      'Commencez par le dashboard pour obtenir une vue nationale des risques, des sources et du dernier pipeline ETL.',
    icon: BarChart3,
  },
  {
    title: '2. Explorer la carte',
    description:
      'Affichez les couches de risque global, inondation, sécheresse, glissement et cyclone sur la carte interactive.',
    icon: Map,
  },
  {
    title: '3. Vérifier les données',
    description:
      'Utilisez la page Données pour suivre les sources, lancer le pipeline et vérifier les jobs ETL.',
    icon: Database,
  },
  {
    title: '4. Générer les rapports',
    description:
      'Téléchargez les rapports PDF, Excel ou CSV à partir des données consolidées.',
    icon: FileText,
  },
];

const modules = [
  {
    title: 'Tableau de bord',
    description:
      'Synthèse multi-risques : indicateurs nationaux, top zones, sources, jobs ETL et rasters actifs.',
    icon: BarChart3,
  },
  {
    title: 'Carte des risques',
    description:
      'Visualisation spatiale des rasters de risque et des limites administratives de Madagascar.',
    icon: Map,
  },
  {
    title: 'Analyse multicritère',
    description:
      'Gestion des pondérations du risque global et des modèles spécifiques.',
    icon: SlidersHorizontal,
  },
  {
    title: 'Données',
    description:
      'Pilotage du pipeline ETL, synchronisation NASA POWER, suivi des sources et des jobs.',
    icon: Database,
  },
  {
    title: 'Alertes',
    description:
      'Suivi des alertes validées, signaux opérationnels et alertes opérationnelles.',
    icon: AlertTriangle,
  },
  {
    title: 'Rapports',
    description:
      'Génération et historique des rapports décisionnels PDF, Excel et CSV.',
    icon: FileText,
  },
  {
    title: 'Paramètres',
    description:
      'Vue opérationnelle de la configuration système, sources, pipelines, alertes et sécurité.',
    icon: ShieldCheck,
  },
];

const faq = [
  {
    question: 'Les risques affichés sont-ils simulés ?',
    answer:
      'Non. Les risques sont calculés à partir de données réelles : CHIRPS, Copernicus DEM, WorldPop, ESA WorldCover, HydroRIVERS, NASA POWER et IBTrACS.',
  },
  {
    question: 'Pourquoi certains calculs prennent-ils du temps ?',
    answer:
      'Le pipeline traite plusieurs rasters, calcule des modèles de risque, met à jour les statistiques zonales, le DWH, les rapports et les alertes.',
  },
  {
    question: 'Que signifie le risque cyclone ?',
    answer:
      'Le risque cyclone actuel est basé sur l’historique IBTrACS. Il indique une exposition historique, pas la détection d’un cyclone actif.',
  },
  {
    question: 'Comment mettre à jour les résultats ?',
    answer:
      'Lancez le pipeline depuis la page Données. Les poids spécifiques modifiés dans Analyse seront appliqués au prochain pipeline.',
  },
  {
    question: 'Pourquoi les alertes sont-elles appelées validées ?',
    answer:
      'Elles sont générées à partir des indicateurs zonaux réels et de seuils explicites, sans simulation.',
  },
];

export default function AidePage() {
  return (
    <div className="space-y-6">
      <section className="relative overflow-hidden rounded-[2rem] border border-slate-200 bg-gradient-to-br from-slate-950 via-slate-900 to-blue-950 p-7 text-white shadow-xl">
        <div className="absolute -right-24 -top-24 h-72 w-72 rounded-full bg-blue-500/25 blur-3xl" />
        <div className="absolute -bottom-28 left-1/3 h-72 w-72 rounded-full bg-emerald-500/20 blur-3xl" />

        <div className="relative flex items-start gap-4">
          <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-3xl bg-white/10 text-emerald-300 shadow-lg ring-1 ring-white/10 backdrop-blur">
            <HelpCircle size={30} />
          </div>

          <div>
            <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/10 px-3 py-1 text-xs font-black uppercase tracking-wide text-emerald-100">
              Centre d’aide
            </div>

            <h2 className="text-3xl font-black tracking-tight">
              Aide et prise en main RISKCLIM-MG
            </h2>

            <p className="mt-2 max-w-4xl text-sm leading-6 text-slate-300">
              Cette page explique les principaux modules de la plateforme et les
              bonnes pratiques pour exploiter les cartes, les indicateurs, les
              rapports et les alertes.
            </p>
          </div>
        </div>
      </section>

      <section className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-4">
        {quickSteps.map((step) => {
          const Icon = step.icon;

          return (
            <div
              key={step.title}
              className="rounded-3xl border border-slate-200 bg-white p-5 shadow-soft dark:border-slate-800 dark:bg-slate-900"
            >
              <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-500 to-green-500 text-white">
                <Icon size={22} />
              </div>

              <h3 className="font-black text-slate-900 dark:text-white">
                {step.title}
              </h3>

              <p className="mt-2 text-sm leading-6 text-slate-500 dark:text-slate-400">
                {step.description}
              </p>
            </div>
          );
        })}
      </section>

      <section className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-soft dark:border-slate-800 dark:bg-slate-900">
        <div className="mb-5 flex items-center gap-3">
          <BookOpen className="text-blue-600" size={24} />
          <div>
            <h3 className="text-lg font-black text-slate-900 dark:text-white">
              Modules de la plateforme
            </h3>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Rôle de chaque module dans la chaîne décisionnelle.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {modules.map((module) => {
            const Icon = module.icon;

            return (
              <div
                key={module.title}
                className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950"
              >
                <div className="mb-3 flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white text-blue-600 shadow-sm dark:bg-slate-900">
                    <Icon size={20} />
                  </div>
                  <h4 className="font-black text-slate-900 dark:text-white">
                    {module.title}
                  </h4>
                </div>

                <p className="text-sm leading-6 text-slate-500 dark:text-slate-400">
                  {module.description}
                </p>
              </div>
            );
          })}
        </div>
      </section>

      <section className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-soft dark:border-slate-800 dark:bg-slate-900">
          <div className="mb-5 flex items-center gap-3">
            <Layers className="text-green-600" size={24} />
            <div>
              <h3 className="text-lg font-black text-slate-900 dark:text-white">
                Bonnes pratiques
              </h3>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                Recommandations d’utilisation.
              </p>
            </div>
          </div>

          <div className="space-y-3 text-sm text-slate-600 dark:text-slate-300">
            {[
              'Vérifier régulièrement le statut des sources dans la page Données.',
              'Relancer le pipeline après modification des poids spécifiques.',
              'Interpréter le cyclone comme risque historique tant qu’aucune source temps réel spécialisée n’est intégrée.',
              'Utiliser les rapports pour conserver une trace décisionnelle.',
              'Ne pas confondre signaux opérationnels et alertes réglementaires officielles.',
            ].map((item) => (
              <div key={item} className="flex items-start gap-2">
                <CheckCircle2 className="mt-0.5 shrink-0 text-green-600" size={17} />
                <span>{item}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-soft dark:border-slate-800 dark:bg-slate-900">
          <div className="mb-5 flex items-center gap-3">
            <LifeBuoy className="text-orange-600" size={24} />
            <div>
              <h3 className="text-lg font-black text-slate-900 dark:text-white">
                Support et contact
              </h3>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                En cas de problème d’accès ou de données.
              </p>
            </div>
          </div>

          <div className="space-y-3 text-sm leading-6 text-slate-600 dark:text-slate-300">
            <p>
              Pour une demande d’accès, utilisez la page publique de contact
              administrateur.
            </p>
            <p>
              Pour une erreur de donnée ou de pipeline, vérifiez d’abord la page
              Données et les derniers jobs ETL.
            </p>
            <p>
              Pour une incohérence de risque, vérifiez la date du dernier pipeline
              et les sources utilisées.
            </p>
          </div>

          <div className="mt-5 rounded-2xl border border-blue-100 bg-blue-50 px-4 py-3 text-sm font-semibold text-blue-800 dark:border-blue-900 dark:bg-blue-950/40 dark:text-blue-200">
            RISKCLIM-MG est un outil d’aide à la décision. Les décisions finales
            doivent être validées par les autorités compétentes.
          </div>
        </div>
      </section>

      <section className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-soft dark:border-slate-800 dark:bg-slate-900">
        <div className="mb-5 flex items-center gap-3">
          <RadioTower className="text-purple-600" size={24} />
          <div>
            <h3 className="text-lg font-black text-slate-900 dark:text-white">
              Questions fréquentes
            </h3>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Réponses rapides aux questions courantes.
            </p>
          </div>
        </div>

        <div className="space-y-4">
          {faq.map((item) => (
            <div
              key={item.question}
              className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950"
            >
              <h4 className="font-black text-slate-900 dark:text-white">
                {item.question}
              </h4>
              <p className="mt-2 text-sm leading-6 text-slate-500 dark:text-slate-400">
                {item.answer}
              </p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
