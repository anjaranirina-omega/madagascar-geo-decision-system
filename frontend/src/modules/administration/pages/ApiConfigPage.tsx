import React, { useState } from 'react';
import { KeyRound, CheckCircle2, Globe, Cpu, RefreshCw, Save, ShieldCheck } from 'lucide-react';
import PageHeader from '../../../shared/components/ui/PageHeader';

const API_PROVIDERS = [
  {
    name: 'NASA POWER API',
    description: 'Données météorologiques et thermiques en temps réel (rayonnement, température).',
    endpoint: 'https://power.larc.nasa.gov/api/temporal/daily/point',
    status: 'Opérationnel',
    frequency: 'Quotidien (04h00 UTC)',
    keyConfigured: true,
  },
  {
    name: 'GDACS (Global Disaster Alert and Coordination System)',
    description: 'Flux RSS et alertes cycloniques actives du bassin Sud-Ouest de l’Océan Indien.',
    endpoint: 'https://www.gdacs.org/xml/rss.xml',
    status: 'Opérationnel',
    frequency: 'Toutes les 30 minutes',
    keyConfigured: true,
  },
  {
    name: 'CHIRPS / UCSB Climate Hazards Group',
    description: 'Précipitations quasi-temps réel par satellite et stations de jaugeage.',
    endpoint: 'https://data.chc.ucsb.edu/products/CHIRPS-2.0/',
    status: 'Opérationnel',
    frequency: 'Penthadaire / Mensuel',
    keyConfigured: true,
  },
  {
    name: 'Copernicus DEM / OpenTopography',
    description: 'Modèle numérique de terrain (MNT/DEM) à 30m de résolution.',
    endpoint: 'https://portal.opentopography.org/API/globaldem',
    status: 'Opérationnel',
    frequency: 'Statique / Référence',
    keyConfigured: true,
  },
];

export default function ApiConfigPage() {
  const [saved, setSaved] = useState(false);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Configuration des Clés & Connecteurs API"
        subtitle="Gestion des points d'accès externes pour les flux météorologiques, satellitaires et d'alertes."
        icon={<KeyRound size={32} />}
      />

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        {API_PROVIDERS.map((api) => (
          <div
            key={api.name}
            className="flex flex-col justify-between rounded-3xl border border-slate-200 bg-white p-6 shadow-soft dark:border-slate-800 dark:bg-slate-900"
          >
            <div>
              <div className="flex items-center justify-between">
                <h4 className="font-black text-slate-900 dark:text-white">{api.name}</h4>
                <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-2.5 py-1 text-[11px] font-black text-green-800 dark:bg-green-950/50 dark:text-green-300">
                  <CheckCircle2 size={13} />
                  {api.status}
                </span>
              </div>

              <p className="mt-2 text-xs text-slate-500 dark:text-slate-400 font-medium">
                {api.description}
              </p>

              <div className="mt-4 rounded-2xl bg-slate-50 p-3 text-[11px] font-mono text-slate-700 dark:bg-slate-950 dark:text-slate-300">
                <span className="text-slate-400">Endpoint : </span>
                {api.endpoint}
              </div>

              <div className="mt-3 flex items-center justify-between text-xs text-slate-500">
                <span>Fréquence de sync :</span>
                <span className="font-bold text-slate-700 dark:text-slate-300">{api.frequency}</span>
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <span className="inline-flex items-center gap-1 text-[11px] font-bold text-slate-400">
                <ShieldCheck size={14} className="text-purple-600" />
                Connexion chiffrée HTTPS
              </span>
              <button
                type="button"
                className="rounded-xl border border-slate-200 px-3 py-1.5 text-xs font-bold text-purple-700 hover:bg-purple-50 dark:border-slate-700 dark:text-purple-300 dark:hover:bg-slate-800"
              >
                Tester la connexion
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
