const statusClasses: Record<string, string> = {
  ACTIVE: 'border-orange-200 bg-orange-50 text-orange-700',
  SUCCESS: 'border-green-200 bg-green-50 text-green-700',
  CONNECTED: 'border-green-200 bg-green-50 text-green-700',
  FAILED: 'border-red-200 bg-red-50 text-red-700',
  RUNNING: 'border-blue-200 bg-blue-50 text-blue-700',
  PENDING: 'border-yellow-200 bg-yellow-50 text-yellow-700',
  RESOLUE: 'border-green-200 bg-green-50 text-green-700',
  IGNOREE: 'border-slate-200 bg-slate-50 text-slate-600',
};

const labels: Record<string, string> = {
  ACTIVE: 'Actif',
  SUCCESS: 'Succès',
  CONNECTED: 'Connecté',
  FAILED: 'Erreur',
  RUNNING: 'En cours',
  PENDING: 'En attente',
  RESOLUE: 'Résolu',
  IGNOREE: 'Ignoré',
};

export default function StatusBadge({ status }: { status?: string | null }) {
  const value = status ?? '—';

  return (
    <span
      className={[
        'inline-flex rounded-full border px-2.5 py-1 text-xs font-black',
        statusClasses[value] ?? 'border-slate-200 bg-slate-50 text-slate-600',
      ].join(' ')}
    >
      {labels[value] ?? value}
    </span>
  );
}
