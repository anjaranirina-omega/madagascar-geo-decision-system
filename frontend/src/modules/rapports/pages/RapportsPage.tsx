import {
  BarChart3,
  ChevronRight,
  Database,
  Download,
  FileSpreadsheet,
  FileText,
  Layers,
  RadioTower,
  Sparkles,
} from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { GeneratedReport, reportsService } from '../services/reports.service';

type ReportAction = {
  title: string;
  description: string;
  format: string;
  icon: typeof FileText;
  action: () => Promise<void>;
};

type WizardStep = 1 | 2 | 3 | 4 | 5;

const riskOptions = [
  { id: 'FLOOD', label: 'Inondation' },
  { id: 'DROUGHT', label: 'Sécheresse' },
  { id: 'LANDSLIDE', label: 'Glissement de terrain' },
  { id: 'CYCLONE', label: 'Cyclone' },
];

const reportTypeLabels: Record<string, string> = {
  national: 'Rapport national',
  region: 'Rapport régional',
  district: 'Rapport par district',
  commune: 'Rapport communal',
  custom: 'Rapport personnalisé',
};

const periodLabels: Record<string, string> = {
  today: "Aujourd'hui",
  '7d': '7 derniers jours',
  '30d': '30 derniers jours',
  custom: 'Période personnalisée',
};

const zoneLevelLabels: Record<string, string> = {
  madagascar: 'Madagascar',
  region: 'Région',
  district: 'District',
  commune: 'Commune',
};

const elementOptions = [
  'Carte raster',
  'Carte administrative',
  'Histogrammes',
  'Courbes temporelles',
  'Tableau statistique',
  'Alertes',
  'Indicateurs climatiques',
  'Population exposée',
  'Méthodologie',
  'Sources des données',
];

function SectionCard({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <div className="mb-5">
        <h3 className="text-lg font-black text-slate-950 dark:text-white">
          {title}
        </h3>
        {subtitle && <p className="mt-1 text-sm text-slate-500">{subtitle}</p>}
      </div>
      {children}
    </section>
  );
}

function ReportCard({
  report,
  onDownloaded,
}: {
  report: ReportAction;
  onDownloaded?: () => Promise<void> | void;
}) {
  const [loading, setLoading] = useState(false);
  const Icon = report.icon;

  const handleDownload = async () => {
    setLoading(true);

    try {
      await report.action();
      await onDownloaded?.();
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="group rounded-3xl border border-slate-200 bg-white p-6 shadow-sm transition hover:-translate-y-0.5 hover:border-blue-200 hover:shadow-xl dark:border-slate-800 dark:bg-slate-900">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-500 to-green-500 text-white shadow-lg">
          <Icon size={24} />
        </div>

        <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-black text-slate-500">
          {report.format}
        </span>
      </div>

      <h3 className="text-lg font-black text-slate-950 dark:text-white">
        {report.title}
      </h3>

      <p className="mt-2 min-h-12 text-sm leading-6 text-slate-500">
        {report.description}
      </p>

      <button
        type="button"
        onClick={handleDownload}
        disabled={loading}
        className="mt-5 inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-green-500 to-blue-600 px-4 text-sm font-black text-white shadow-lg shadow-blue-900/10 transition hover:scale-[1.01] disabled:cursor-not-allowed disabled:opacity-60"
      >
        <Download size={18} />
        {loading ? 'Génération...' : 'Télécharger'}
      </button>
    </div>
  );
}

function formatReportDate(value?: string | null) {
  if (!value) return '—';

  /*
   * Les dates PostgreSQL / TypeORM peuvent arriver :
   * - avec Z : 2026-08-05T07:21:00.000Z
   * - sans Z : 2026-08-05T07:21:00.000
   * - avec espace : 2026-08-05 07:21:00.000
   *
   * On normalise en UTC si aucune timezone n'est indiquée,
   * puis on affiche explicitement en heure Madagascar.
   */
  const cleanedValue = String(value).trim().replace(' ', 'T');
  const hasTimezone = /Z$|[+-]\d{2}:?\d{2}$/.test(cleanedValue);
  const normalizedValue = hasTimezone ? cleanedValue : `${cleanedValue}Z`;

  const date = new Date(normalizedValue);

  if (Number.isNaN(date.getTime())) {
    return '—';
  }

  return new Intl.DateTimeFormat('fr-FR', {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: 'Indian/Antananarivo',
  }).format(date);
}

function formatFileSize(value?: number | null) {
  if (!value) return '—';

  if (value > 1024 * 1024) {
    return `${(value / 1024 / 1024).toFixed(1)} MB`;
  }

  if (value > 1024) {
    return `${(value / 1024).toFixed(1)} KB`;
  }

  return `${value} B`;
}

function ChoiceButton({
  active,
  label,
  onClick,
}: {
  active: boolean;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        'rounded-2xl border px-4 py-3 text-left text-sm font-bold transition',
        active
          ? 'border-blue-300 bg-blue-50 text-blue-800 shadow-sm'
          : 'border-slate-200 bg-white text-slate-600 hover:border-blue-200 hover:bg-slate-50',
      ].join(' ')}
    >
      {label}
    </button>
  );
}

export default function RapportsPage() {
  const [wizardOpen, setWizardOpen] = useState(false);
  const [step, setStep] = useState<WizardStep>(1);
  const [loadingWizard, setLoadingWizard] = useState(false);
  const [history, setHistory] = useState<GeneratedReport[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  const [reportType, setReportType] = useState('national');
  const [period, setPeriod] = useState('30d');
  const [selectedRisks, setSelectedRisks] = useState<string[]>([
    'FLOOD',
    'DROUGHT',
    'LANDSLIDE',
    'CYCLONE',
  ]);
  const [zoneLevel, setZoneLevel] = useState('madagascar');
  const [selectedElements, setSelectedElements] =
    useState<string[]>(elementOptions);

  const loadHistory = async () => {
    setHistoryLoading(true);

    try {
      const response = await reportsService.getHistory(50);
      setHistory(response);
    } finally {
      setHistoryLoading(false);
    }
  };

  useEffect(() => {
    loadHistory();
  }, []);

  const downloadHistoryReport = async (report: GeneratedReport) => {
    await reportsService.downloadHistory(report);
  };

  const deleteHistoryReport = async (id: string) => {
    if (!window.confirm('Supprimer ce rapport de l’historique ?')) {
      return;
    }

    await reportsService.deleteHistory(id);
    await loadHistory();
  };

  const reports: ReportAction[] = [
    {
      title: 'Rapport national multi-risques',
      description:
        'Rapport PDF structuré avec résumé exécutif, top zones, sources, ETL, méthodologie et recommandations.',
      format: 'PDF',
      icon: FileText,
      action: () => reportsService.downloadNationalPdf(),
    },
    {
      title: 'Classeur national multi-risques',
      description:
        'Export Excel avec synthèse, top zones, sources, jobs ETL et rasters actifs.',
      format: 'XLSX',
      icon: FileSpreadsheet,
      action: () => reportsService.downloadNationalExcel(),
    },
    {
      title: 'Synthèse des risques',
      description:
        'Export CSV des indicateurs agrégés par type de risque et niveau administratif.',
      format: 'CSV',
      icon: BarChart3,
      action: () => reportsService.downloadRiskSummaryCsv(),
    },
    {
      title: 'Top zones exposées',
      description:
        'Export Excel des zones les plus exposées tous risques confondus.',
      format: 'XLSX',
      icon: Layers,
      action: () =>
        reportsService.downloadTopRiskZonesExcel({
          zoneType: 'region',
          limit: 100,
        }),
    },
    {
      title: 'Top zones exposées PDF',
      description:
        'Rapport PDF court listant les principales zones régionales à risque.',
      format: 'PDF',
      icon: FileText,
      action: () =>
        reportsService.downloadTopRiskZonesPdf({
          zoneType: 'region',
          limit: 50,
        }),
    },
    {
      title: 'Sources de données',
      description:
        'Export Excel de l’état des sources utilisées par la plateforme.',
      format: 'XLSX',
      icon: RadioTower,
      action: () => reportsService.downloadDataSourcesExcel(),
    },
    {
      title: 'Jobs ETL récents',
      description:
        'Export CSV des derniers traitements ETL exécutés par la plateforme.',
      format: 'CSV',
      icon: Database,
      action: () => reportsService.downloadEtlJobsCsv(),
    },
  ];

  const selectedRisksLabel = useMemo(
    () =>
      riskOptions
        .filter((item) => selectedRisks.includes(item.id))
        .map((item) => item.label)
        .join(', '),
    [selectedRisks],
  );

  const toggleRisk = (risk: string) => {
    setSelectedRisks((current) =>
      current.includes(risk)
        ? current.filter((item) => item !== risk)
        : [...current, risk],
    );
  };

  const toggleElement = (element: string) => {
    setSelectedElements((current) =>
      current.includes(element)
        ? current.filter((item) => item !== element)
        : [...current, element],
    );
  };

  const getZoneTypeForReport = () => {
    if (reportType === 'commune' || zoneLevel === 'commune') {
      return 'commune';
    }

    if (reportType === 'district' || zoneLevel === 'district') {
      return 'district';
    }

    return 'region';
  };

  const getRiskTypeForReport = () => {
    if (selectedRisks.length === 1) {
      return selectedRisks[0];
    }

    return undefined;
  };

  const generateWizardReport = async () => {
    setLoadingWizard(true);

    try {
      const zoneType = getZoneTypeForReport();
      const riskType = getRiskTypeForReport();

      /*
       * V1 professionnelle :
       * - le rapport national génère le PDF national complet ;
       * - les autres types génèrent un rapport PDF des zones exposées avec
       *   filtrage par niveau administratif et par risque si un seul risque est choisi.
       *
       * Les filtres période, zone précise et éléments à intégrer sont conservés
       * côté interface et seront exploités dans les prochaines features :
       * reports-history, reports-comparison, report-raster-map-snapshots.
       */
      if (reportType === 'national' && zoneLevel === 'madagascar') {
        await reportsService.downloadNationalPdf();
      } else {
        await reportsService.downloadTopRiskZonesPdf({
          zoneType,
          riskType,
          limit: 100,
        });
      }

      await loadHistory();

      setWizardOpen(false);
      setStep(1);
    } finally {
      setLoadingWizard(false);
    }
  };

  return (
    <div className="space-y-7">
      <section className="relative overflow-hidden rounded-[2rem] border border-white/70 bg-gradient-to-br from-slate-950 via-slate-900 to-blue-950 p-7 text-white shadow-xl">
        <div className="absolute -right-20 -top-24 h-72 w-72 rounded-full bg-blue-400/20 blur-3xl" />
        <div className="absolute -bottom-24 left-1/3 h-72 w-72 rounded-full bg-green-500/20 blur-3xl" />

        <div className="relative flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/10 px-3 py-1 text-xs font-bold text-blue-100">
              <FileText size={15} />
              Exports décisionnels • PDF • Excel • CSV
            </div>

            <h2 className="text-3xl font-black tracking-tight">
              Tableau de bord des rapports
            </h2>

            <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-300">
              Génération à la demande de rapports professionnels à partir des
              données réelles du DWH, des indicateurs zonaux, des sources et des
              jobs ETL.
            </p>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row">
            <button
              type="button"
              onClick={() => setWizardOpen(true)}
              className="inline-flex h-12 items-center justify-center gap-2 rounded-2xl bg-white px-5 text-sm font-black text-slate-900 shadow-lg transition hover:scale-[1.02]"
            >
              <Sparkles size={18} />
              Nouveau rapport
            </button>
          </div>
        </div>
      </section>

      <section className="grid grid-cols-1 gap-5 md:grid-cols-2">
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm font-bold text-slate-500">
                Exports disponibles
              </div>
              <div className="mt-2 text-3xl font-black text-slate-950">
                {reports.length}
              </div>
            </div>
            <div className="rounded-2xl bg-blue-50 p-3 text-blue-600">
              <Download size={24} />
            </div>
          </div>
          <p className="mt-2 text-xs text-slate-500">
            Rapports générés à la demande, sans données simulées.
          </p>
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="text-sm font-bold text-slate-500">Dernier rapport</div>
          <div className="mt-2 text-lg font-black text-slate-950">
            Rapport national des risques
          </div>
          <div className="mt-3 flex gap-2">
            <span className="rounded-full bg-red-50 px-3 py-1 text-xs font-black text-red-700">
              PDF
            </span>
            <span className="rounded-full bg-green-50 px-3 py-1 text-xs font-black text-green-700">
              Excel
            </span>
          </div>
        </div>
      </section>

      <SectionCard
        title="Rapports disponibles"
        subtitle="Exports générés à partir des données consolidées du système."
      >
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
          {reports.map((report) => (
            <ReportCard
              key={`${report.title}-${report.format}`}
              report={report}
              onDownloaded={loadHistory}
            />
          ))}
        </div>
      </SectionCard>

      <section className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        <SectionCard
          title="Historique des rapports"
          subtitle="Rapports réellement générés et stockés par la plateforme."
        >
          <div className="mb-4 flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500">
              {history.length} rapport(s)
            </span>

            <button
              type="button"
              onClick={loadHistory}
              disabled={historyLoading}
              className="rounded-xl border border-slate-200 px-3 py-2 text-xs font-bold text-slate-600 disabled:opacity-50"
            >
              {historyLoading ? 'Chargement...' : 'Actualiser'}
            </button>
          </div>

          <div className="max-h-[360px] overflow-y-auto rounded-2xl border border-slate-100">
            {history.length > 0 ? (
              <table className="w-full text-left text-sm">
                <thead className="sticky top-0 bg-slate-50 text-xs uppercase text-slate-400">
                  <tr>
                    <th className="px-3 py-3">Titre</th>
                    <th className="px-3 py-3">Type</th>
                    <th className="px-3 py-3">Format</th>
                    <th className="px-3 py-3">Date</th>
                    <th className="px-3 py-3">Taille</th>
                    <th className="px-3 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {history.map((report) => (
                    <tr
                      key={report.id}
                      className="border-t border-slate-100 hover:bg-slate-50"
                    >
                      <td className="px-3 py-3 font-bold text-slate-800">
                        {report.title}
                      </td>
                      <td className="px-3 py-3 text-slate-500">
                        {report.reportType}
                      </td>
                      <td className="px-3 py-3">
                        <span className="rounded-full bg-blue-50 px-2 py-1 text-xs font-black text-blue-700">
                          {report.format}
                        </span>
                      </td>
                      <td className="px-3 py-3 text-slate-500">
                        {report.generatedAtLocal ?? formatReportDate(report.createdAt)}
                      </td>
                      <td className="px-3 py-3 text-slate-500">
                        {formatFileSize(report.fileSizeBytes)}
                      </td>
                      <td className="px-3 py-3 text-right">
                        <div className="flex justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => downloadHistoryReport(report)}
                            className="rounded-lg bg-green-50 px-2 py-1 text-xs font-black text-green-700"
                          >
                            Télécharger
                          </button>
                          <button
                            type="button"
                            onClick={() => deleteHistoryReport(report.id)}
                            className="rounded-lg bg-red-50 px-2 py-1 text-xs font-black text-red-700"
                          >
                            Supprimer
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div className="p-6 text-center text-sm text-slate-500">
                Aucun rapport généré pour le moment.
              </div>
            )}
          </div>
        </SectionCard>

        <SectionCard
          title="Comparaison"
          subtitle="Comparaison entre périodes prévue avec l’historisation DWH."
        >
          <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-5 text-sm text-slate-500">
            Exemple futur : Juin vs Juillet, évolution des risques, de la pluie,
            des alertes et des zones critiques.
          </div>
        </SectionCard>

        <SectionCard
          title="Exports avancés"
          subtitle="Formats géospatiaux prévus dans une feature dédiée."
        >
          <div className="grid grid-cols-2 gap-2 text-sm">
            {['PDF', 'Excel', 'CSV', 'GeoJSON', 'Shapefile', 'PNG', 'JPEG'].map(
              (format) => (
                <div
                  key={format}
                  className="rounded-xl border border-slate-100 bg-slate-50 px-3 py-2 font-bold text-slate-600"
                >
                  {format}
                </div>
              ),
            )}
          </div>
        </SectionCard>
      </section>

      <section className="rounded-3xl border border-emerald-100 bg-emerald-50 p-5 text-sm text-emerald-950">
        <div className="font-black">Rapports sans données simulées</div>
        <p className="mt-1 leading-6">
          Les fichiers générés utilisent les données consolidées du DWH, des
          statistiques zonales, des sources de données et du pipeline ETL. Aucun
          module intervention n’est utilisé.
        </p>
      </section>

      {wizardOpen && (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm">
          <div className="max-h-[90vh] w-full max-w-4xl overflow-y-auto rounded-[2rem] bg-white p-6 shadow-2xl">
            <div className="mb-6 flex items-start justify-between gap-4">
              <div>
                <h3 className="text-2xl font-black text-slate-950">
                  Assistant de génération de rapport
                </h3>
                <p className="mt-1 text-sm text-slate-500">
                  Configurez le rapport décisionnel à générer.
                </p>
              </div>

              <button
                type="button"
                onClick={() => setWizardOpen(false)}
                className="rounded-xl border border-slate-200 px-3 py-2 text-sm font-bold text-slate-600"
              >
                Fermer
              </button>
            </div>

            <div className="mb-6 grid grid-cols-5 gap-2">
              {[1, 2, 3, 4, 5].map((item) => (
                <button
                  key={item}
                  type="button"
                  onClick={() => setStep(item as WizardStep)}
                  className={[
                    'rounded-xl px-3 py-2 text-xs font-black',
                    step === item
                      ? 'bg-blue-600 text-white'
                      : 'bg-slate-100 text-slate-500',
                  ].join(' ')}
                >
                  Étape {item}
                </button>
              ))}
            </div>

            {step === 1 && (
              <div>
                <h4 className="mb-4 font-black text-slate-900">
                  Étape 1 — Type de rapport
                </h4>
                <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                  {[
                    ['national', 'Rapport national'],
                    ['region', 'Rapport régional'],
                    ['district', 'Rapport par district'],
                    ['commune', 'Rapport communal'],
                    ['custom', 'Rapport personnalisé'],
                  ].map(([id, label]) => (
                    <ChoiceButton
                      key={id}
                      active={reportType === id}
                      label={label}
                      onClick={() => setReportType(id)}
                    />
                  ))}
                </div>
              </div>
            )}

            {step === 2 && (
              <div>
                <h4 className="mb-4 font-black text-slate-900">
                  Étape 2 — Période
                </h4>
                <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                  {[
                    ['today', "Aujourd'hui"],
                    ['7d', '7 derniers jours'],
                    ['30d', '30 derniers jours'],
                    ['custom', 'Personnalisée'],
                  ].map(([id, label]) => (
                    <ChoiceButton
                      key={id}
                      active={period === id}
                      label={label}
                      onClick={() => setPeriod(id)}
                    />
                  ))}
                </div>
              </div>
            )}

            {step === 3 && (
              <div>
                <h4 className="mb-4 font-black text-slate-900">
                  Étape 3 — Risques à intégrer
                </h4>
                <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                  {riskOptions.map((risk) => (
                    <button
                      key={risk.id}
                      type="button"
                      onClick={() => toggleRisk(risk.id)}
                      className={[
                        'rounded-2xl border px-4 py-3 text-left text-sm font-bold transition',
                        selectedRisks.includes(risk.id)
                          ? 'border-green-300 bg-green-50 text-green-800'
                          : 'border-slate-200 bg-white text-slate-600',
                      ].join(' ')}
                    >
                      {selectedRisks.includes(risk.id) ? '☑' : '☐'} {risk.label}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {step === 4 && (
              <div>
                <h4 className="mb-4 font-black text-slate-900">
                  Étape 4 — Zone
                </h4>
                <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                  {[
                    ['madagascar', 'Madagascar'],
                    ['region', 'Région'],
                    ['district', 'District'],
                    ['commune', 'Commune'],
                  ].map(([id, label]) => (
                    <ChoiceButton
                      key={id}
                      active={zoneLevel === id}
                      label={label}
                      onClick={() => setZoneLevel(id)}
                    />
                  ))}
                </div>
              </div>
            )}

            {step === 5 && (
              <div>
                <h4 className="mb-4 font-black text-slate-900">
                  Étape 5 — Éléments à intégrer
                </h4>
                <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                  {elementOptions.map((element) => (
                    <button
                      key={element}
                      type="button"
                      onClick={() => toggleElement(element)}
                      className={[
                        'rounded-2xl border px-4 py-3 text-left text-sm font-bold transition',
                        selectedElements.includes(element)
                          ? 'border-blue-300 bg-blue-50 text-blue-800'
                          : 'border-slate-200 bg-white text-slate-600',
                      ].join(' ')}
                    >
                      {selectedElements.includes(element) ? '☑' : '☐'} {element}
                    </button>
                  ))}
                </div>

                <div className="mt-5 rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
                  <div className="font-black text-slate-800">
                    Résumé de configuration
                  </div>
                  <div className="mt-2 space-y-1">
                    <div>Type : {reportTypeLabels[reportType] ?? reportType}</div>
                    <div>Période : {periodLabels[period] ?? period}</div>
                    <div>Risques : {selectedRisksLabel || 'Tous risques'}</div>
                    <div>Zone : {zoneLevelLabels[zoneLevel] ?? zoneLevel}</div>
                    <div>Éléments : {selectedElements.length} sélectionnés</div>
                  </div>

                  <div className="mt-3 rounded-xl bg-blue-50 px-3 py-2 text-xs font-semibold text-blue-700">
                    Les filtres avancés seront exploités plus finement dans les prochaines versions du module rapports.
                  </div>
                </div>
              </div>
            )}

            <div className="mt-8 flex items-center justify-between border-t border-slate-100 pt-5">
              <button
                type="button"
                onClick={() => setStep((current) => Math.max(1, current - 1) as WizardStep)}
                disabled={step === 1}
                className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-bold text-slate-600 disabled:opacity-40"
              >
                Précédent
              </button>

              {step < 5 ? (
                <button
                  type="button"
                  onClick={() => setStep((current) => Math.min(5, current + 1) as WizardStep)}
                  className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-2 text-sm font-black text-white"
                >
                  Suivant
                  <ChevronRight size={17} />
                </button>
              ) : (
                <button
                  type="button"
                  onClick={generateWizardReport}
                  disabled={loadingWizard}
                  className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-green-500 to-blue-600 px-5 py-2 text-sm font-black text-white disabled:opacity-60"
                >
                  <Download size={17} />
                  {loadingWizard
                    ? 'Génération...'
                    : reportType === 'national' && zoneLevel === 'madagascar'
                      ? 'Générer le rapport national'
                      : 'Générer le rapport des zones exposées'}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
