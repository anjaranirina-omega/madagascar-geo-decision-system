import { Eye, CloudSun } from 'lucide-react';
import { FormEvent, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppStore } from '../../../app/store';
import { authService } from '../auth.service';

export default function LoginPage() {
  const navigate = useNavigate();
  const setAuth = useAppStore((state) => state.setAuth);

  const [email, setEmail] = useState('admin@georisque.mg');
  const [password, setPassword] = useState('admin123');
  const [error, setError] = useState('');

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setError('');

    try {
      const result = await authService.login({ email, password });
      setAuth(result.accessToken, result.refreshToken, result.user);
      navigate('/');
    } catch {
      setError('Nom d’utilisateur ou mot de passe invalide');
    }
  };

  return (
    <div className="grid min-h-screen grid-cols-1 bg-white lg:grid-cols-[45%_55%]">
      <div className="relative hidden overflow-hidden bg-riskdark lg:block">
        <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-slate-800 to-green-950" />

        <div className="absolute inset-0 opacity-30">
          <div className="h-full w-full bg-[radial-gradient(circle_at_30%_20%,#22c55e,transparent_25%),radial-gradient(circle_at_70%_60%,#38bdf8,transparent_30%)]" />
        </div>

        <div className="relative flex h-full flex-col justify-end p-12 text-white">
          <div className="mb-8 flex items-center gap-3">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-green-400 to-sky-400">
              <CloudSun size={32} />
            </div>
            <div className="text-2xl font-black">RISKLIM-MG</div>
          </div>

          <p className="max-w-sm text-lg font-medium text-slate-100">
            Système décisionnel spatial pour l’analyse des risques climatiques à Madagascar.
          </p>
        </div>
      </div>

      <div className="flex items-center justify-center px-8 py-12">
        <form onSubmit={handleSubmit} className="w-full max-w-md">
          <h1 className="mb-10 text-center text-3xl font-extrabold text-slate-900">
            Connexion
          </h1>

          {error && (
            <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
              {error}
            </div>
          )}

          <label className="mb-2 block text-sm font-bold text-slate-700">
            Nom d’utilisateur
          </label>
          <input
            type="email"
            placeholder="Entrez votre email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            className="mb-5 w-full rounded-lg border border-slate-300 px-4 py-3 text-sm outline-none transition focus:border-riskgreen focus:ring-2 focus:ring-green-100"
          />

          <label className="mb-2 block text-sm font-bold text-slate-700">
            Mot de passe
          </label>
          <div className="relative mb-4">
            <input
              type="password"
              placeholder="Entrez votre mot de passe"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="w-full rounded-lg border border-slate-300 px-4 py-3 pr-11 text-sm outline-none transition focus:border-riskgreen focus:ring-2 focus:ring-green-100"
            />
            <Eye
              size={18}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400"
            />
          </div>

          <div className="mb-8 flex items-center justify-between text-sm">
            <label className="flex items-center gap-2 text-slate-600">
              <input type="checkbox" className="rounded border-slate-300" />
              Se souvenir de moi
            </label>

            <a href="#" className="font-medium text-riskgreen hover:underline">
              Mot de passe oublié ?
            </a>
          </div>

          <button
            type="submit"
            className="w-full rounded-lg bg-riskgreen py-3 text-sm font-bold text-white shadow-lg shadow-green-900/20 transition hover:bg-green-700"
          >
            Se connecter
          </button>

          <p className="mt-12 text-center text-sm text-slate-500">
            Pas encore de compte ?{' '}
            <span className="font-semibold text-riskgreen">
              Contactez l’administrateur
            </span>
          </p>
        </form>
      </div>
    </div>
  );
}
