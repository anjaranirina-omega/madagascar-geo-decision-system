import { AlertTriangle, ArrowLeft, ShieldCheck } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAppStore } from '../../app/store';
import { getDefaultPathForRole, normalizeRole, ROLE_LABELS } from '../auth/roles';

export default function AccessDeniedPage() {
  const navigate = useNavigate();
  const user = useAppStore((state) => state.user);
  const role = normalizeRole(user?.role?.name);
  const roleLabel = role ? ROLE_LABELS[role] : 'Rôle non reconnu';

  return (
    <div className="flex min-h-[65vh] items-center justify-center">
      <div className="max-w-2xl rounded-[2rem] border border-slate-200 bg-white p-8 text-center shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-red-50 text-red-600 dark:bg-red-950/40 dark:text-red-300">
          <AlertTriangle size={34} />
        </div>

        <h1 className="mt-6 text-3xl font-black tracking-tight text-slate-950 dark:text-white">
          Accès refusé
        </h1>

        <p className="mt-4 text-slate-600 dark:text-slate-300">
          Votre rôle actuel ne permet pas d’accéder à cette section de la plateforme.
        </p>

        <div className="mt-6 rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-300">
          <div className="flex items-center justify-center gap-2 font-extrabold text-slate-900 dark:text-white">
            <ShieldCheck size={18} />
            Rôle connecté : {roleLabel}
          </div>
          <p className="mt-2">
            Si vous pensez qu’il s’agit d’une erreur, contactez l’administrateur de la plateforme.
          </p>
        </div>

        <button
          type="button"
          onClick={() => navigate(getDefaultPathForRole(user?.role?.name), { replace: true })}
          className="mt-7 inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-green-500 to-blue-600 px-5 text-sm font-extrabold text-white shadow-lg shadow-blue-950/20 transition hover:scale-[1.02]"
        >
          <ArrowLeft size={18} />
          Retour à mon espace
        </button>
      </div>
    </div>
  );
}
