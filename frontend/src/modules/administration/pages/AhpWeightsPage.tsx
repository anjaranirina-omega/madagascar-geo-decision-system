import React, { useState } from 'react';
import { Scale, Sliders, CheckCircle2, RefreshCw, Save, Info } from 'lucide-react';
import PageHeader from '../../../shared/components/ui/PageHeader';

const DEFAULT_MODELS = [
  {
    key: 'FLOOD',
    title: 'Modèle Inondation',
    description: 'Pondération par défaut pour la submersion et crue des cours d’eau.',
    cr: '0.042',
    weights: [
      { name: 'Précipitations CHIRPS', code: 'precipitations', weight: 45 },
      { name: 'Pente topographique', code: 'pente', weight: 25 },
      { name: 'Proximité cours d’eau', code: 'proximite_cours_eau', weight: 20 },
      { name: 'Densité de population', code: 'densite_population', weight: 10 },
    ],
  },
  {
    key: 'CYCLONE',
    title: 'Modèle Cyclone Tropical',
    description: 'Pondération par défaut pour les trajectoires, vents et rafales.',
    cr: '0.038',
    weights: [
      { name: 'Vitesse des vents', code: 'vent', weight: 40 },
      { name: 'Précipitations CHIRPS', code: 'precipitations', weight: 30 },
      { name: 'Infrastructures critiques', code: 'infrastructures_critiques', weight: 20 },
      { name: 'Densité de population', code: 'densite_population', weight: 10 },
    ],
  },
  {
    key: 'DROUGHT',
    title: 'Modèle Sécheresse & Stress hydrique',
    description: 'Pondération par défaut pour le déficit pluviométrique et thermique.',
    cr: '0.029',
    weights: [
      { name: 'Déficit pluviométrique', code: 'precipitations', weight: 40 },
      { name: 'Température NASA POWER', code: 'temperature', weight: 30 },
      { name: 'Occupation du sol', code: 'occupation_sol', weight: 20 },
      { name: 'Population exposée', code: 'densite_population', weight: 10 },
    ],
  },
  {
    key: 'LANDSLIDE',
    title: 'Modèle Glissement de terrain',
    description: 'Pondération par défaut pour la stabilité des versants et ruissellement.',
    cr: '0.045',
    weights: [
      { name: 'Pente topographique (DEM)', code: 'pente', weight: 40 },
      { name: 'Précipitations CHIRPS', code: 'precipitations', weight: 35 },
      { name: 'Occupation du sol', code: 'occupation_sol', weight: 15 },
      { name: 'Infrastructures exposées', code: 'infrastructures_critiques', weight: 10 },
    ],
  },
];

export default function AhpWeightsPage() {
  const [saved, setSaved] = useState(false);

  const handleSave = () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Paramétrage des Poids AHP par Défaut"
        subtitle="Calibration globale des matrices de Saaty utilisées lors du calcul des indices de risque par l’ETL."
        icon={<Scale size={32} />}
        actions={
          <button
            onClick={handleSave}
            className="inline-flex items-center gap-2 rounded-2xl bg-gradient-to-r from-purple-600 to-indigo-600 px-4 py-2.5 text-xs font-bold text-white shadow-xs hover:opacity-95"
          >
            <Save size={15} />
            <span>Enregistrer la configuration</span>
          </button>
        }
      />

      {saved && (
        <div className="flex items-center gap-2 rounded-2xl border border-green-200 bg-green-50 p-4 text-xs font-bold text-green-800 dark:border-green-900 dark:bg-green-950/40 dark:text-green-300">
          <CheckCircle2 size={16} />
          <span>Configuration des poids AHP enregistrée avec succès.</span>
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        {DEFAULT_MODELS.map((model) => (
          <div
            key={model.key}
            className="rounded-3xl border border-slate-200 bg-white p-6 shadow-soft dark:border-slate-800 dark:bg-slate-900"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <h4 className="text-base font-black text-slate-900 dark:text-white">
                  {model.title}
                </h4>
                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                  {model.description}
                </p>
              </div>
              <span className="shrink-0 rounded-xl bg-green-100 px-2.5 py-1 text-xs font-black text-green-800 dark:bg-green-950/50 dark:text-green-300">
                CR: {model.cr} (&lt;10%)
              </span>
            </div>

            <div className="mt-5 space-y-3">
              {model.weights.map((w) => (
                <div key={w.code} className="space-y-1">
                  <div className="flex justify-between text-xs font-bold">
                    <span className="text-slate-700 dark:text-slate-300">{w.name}</span>
                    <span className="text-purple-600 dark:text-purple-400 font-black">{w.weight}%</span>
                  </div>
                  <div className="h-2 w-full rounded-full bg-slate-100 overflow-hidden dark:bg-slate-800">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-purple-500 to-indigo-500"
                      style={{ width: `${w.weight}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
