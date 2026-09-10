import React from 'react';
import { Shield, Check, X, Key } from 'lucide-react';
import PageHeader from '../../../shared/components/ui/PageHeader';
import { AppRole, PAGE_ACCESS, ROLE_LABELS } from '../../../shared/auth/roles';

const ROLES: AppRole[] = ['ADMIN', 'ANALYSTE', 'DECIDEUR'];

const MODULE_DEFINITIONS = [
  { key: 'dashboard', label: 'Tableau de bord', desc: 'KPIs, météo, alertes globales, séries temporelles' },
  { key: 'carte', label: 'Carte interactive & SIG', desc: 'Visualisation raster, couches vectorielles, point-and-click' },
  { key: 'analyse', label: 'Analyse multicritère & SOLAP', desc: 'Pondération AHP, cohérence Saaty, cube DWH' },
  { key: 'alertes', label: 'Gestion des alertes', desc: 'Déclenchement, seuils de criticité, notifications temps réel' },
  { key: 'donnees', label: 'Gestion des données', desc: 'Import raster/vectoriel, sources GDACS, CHIRPS, DEM' },
  { key: 'rapports', label: 'Génération de rapports', desc: 'Exports PDF décisionnels, bilans territoriaux' },
  { key: 'parametres', label: 'Paramètres système', desc: 'Configuration globale, API, modèles AHP' },
  { key: 'utilisateurs', label: 'Gestion des utilisateurs', desc: 'Création, modification, attribution des rôles' },
  { key: 'demandesComptes', label: 'Validation des inscriptions', desc: 'Approbation des demandes de compte' },
];

export default function RolesPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Gestion des Rôles & Permissions (RBAC)"
        subtitle="Matrice des privilèges et habilitations d'accès aux modules de la plateforme décisionnelle."
        icon={<Shield size={32} className="text-emerald-400" />}
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {ROLES.map((role) => (
          <div
            key={role}
            className="rounded-3xl border border-slate-200 bg-white p-5 shadow-soft dark:border-slate-800 dark:bg-slate-900"
          >
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-purple-50 text-purple-600 dark:bg-purple-950/50 dark:text-purple-300">
                <Key size={18} />
              </div>
              <div>
                <h4 className="text-sm font-black text-slate-900 dark:text-white">
                  {ROLE_LABELS[role]}
                </h4>
                <span className="text-[11px] font-mono text-purple-600 dark:text-purple-400">
                  {role}
                </span>
              </div>
            </div>
            <p className="mt-3 text-xs text-slate-500 dark:text-slate-400">
              {role === 'ADMIN' && 'Contrôle total du système, gestion des utilisateurs, API et DWH.'}
              {role === 'ANALYSTE' && 'Calibration des modèles AHP, imports de rasters et analyses SOLAP.'}
              {role === 'DECIDEUR' && 'Consultation stratégique, tableaux de bord de synthèse et exports PDF.'}
            </p>
          </div>
        ))}
      </div>

      <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-soft dark:border-slate-800 dark:bg-slate-900">
        <h3 className="text-base font-black text-slate-900 dark:text-white mb-4">
          Matrice d'Habilitation par Module
        </h3>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 font-black text-slate-600 dark:text-slate-400">
                <th className="p-4">Module / Fonctionnalité</th>
                <th className="p-4">Description</th>
                {ROLES.map((role) => (
                  <th key={role} className="p-4 text-center">
                    {ROLE_LABELS[role]}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-medium">
              {MODULE_DEFINITIONS.map((mod) => {
                const allowed = (PAGE_ACCESS as Record<string, AppRole[]>)[mod.key] || [];
                return (
                  <tr key={mod.key} className="hover:bg-slate-50/50 dark:hover:bg-slate-950/40">
                    <td className="p-4 font-black text-slate-900 dark:text-white">
                      {mod.label}
                    </td>
                    <td className="p-4 text-slate-500 dark:text-slate-400">
                      {mod.desc}
                    </td>
                    {ROLES.map((role) => {
                      const hasAccess = allowed.includes(role);
                      return (
                        <td key={role} className="p-4 text-center">
                          {hasAccess ? (
                            <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-green-100 text-green-700 dark:bg-green-950/60 dark:text-green-300">
                              <Check size={14} />
                            </span>
                          ) : (
                            <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-slate-100 text-slate-400 dark:bg-slate-800 dark:text-slate-600">
                              <X size={14} />
                            </span>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
