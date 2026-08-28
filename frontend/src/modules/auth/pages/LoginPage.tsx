import { zodResolver } from '@hookform/resolvers/zod';
import {
  BarChart3,
  Bell,
  CloudRain,
  Eye,
  EyeOff,
  Leaf,
  Lock,
  MapPin,
  ShieldCheck,
  User,
} from 'lucide-react';
import { ClipboardEvent, useMemo, useState } from 'react';
import { Controller, SubmitHandler, useForm } from 'react-hook-form';
import { Link, useNavigate } from 'react-router-dom';
import { z } from 'zod';
import { useAppStore } from '../../../app/store';
import { getDefaultPathForRole } from '../../../shared/auth/roles';
import { authService } from '../auth.service';

const loginSchema = z.object({
  email: z
    .string()
    .trim()
    .min(1, 'L’email est obligatoire.')
    .email('Veuillez saisir une adresse email valide.'),
  password: z
    .string()
    .min(1, 'Le mot de passe est obligatoire.')
    .min(6, 'Le mot de passe doit contenir au moins 6 caractères.'),
  rememberMe: z.boolean(),
});

type LoginFormValues = z.infer<typeof loginSchema>;

function containsSuspiciousScript(value: string) {
  const normalized = value.toLowerCase();

  return (
    normalized.includes('<script') ||
    normalized.includes('</script') ||
    normalized.includes('javascript:') ||
    normalized.includes('onerror=') ||
    normalized.includes('onload=')
  );
}

function getRedirectPathByRole(roleName?: string) {
  return getDefaultPathForRole(roleName);
}

function getAuthErrorMessage(error: unknown) {
  if (typeof error === 'object' && error !== null && 'response' in error) {
    const response = (error as {
      response?: {
        status?: number;
        data?: {
          message?: string | string[];
        };
      };
    }).response;

    const status = response?.status;
    const message = response?.data?.message;

    const normalizedMessage = Array.isArray(message)
      ? message.join(' ')
      : message ?? '';

    if (status === 401) {
      return 'Identifiants invalides ou compte désactivé.';
    }

    if (status === 403 || normalizedMessage.toLowerCase().includes('désactiv')) {
      return 'Votre compte est désactivé. Veuillez contacter l’administrateur.';
    }

    if (status && status >= 500) {
      return 'Le serveur est momentanément indisponible. Réessayez plus tard.';
    }
  }

  return 'Impossible de se connecter. Vérifiez vos informations puis réessayez.';
}

function LogoMark({ compact = false }: { compact?: boolean }) {
  return (
    <div className="flex items-center gap-4">
      <div
        className={
          compact
            ? 'flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-green-500 via-teal-500 to-blue-500 text-white shadow-xl shadow-blue-900/20'
            : 'relative flex h-20 w-20 items-center justify-center text-white'
        }
      >
        {compact ? (
          <>
            <CloudRain size={34} strokeWidth={2.2} />
            <Leaf
              size={25}
              strokeWidth={2.4}
              className="-ml-3 mt-6 text-white"
            />
          </>
        ) : (
          <>
            <CloudRain size={74} strokeWidth={2.2} />
            <Leaf
              size={42}
              strokeWidth={2.4}
              className="absolute bottom-1 right-0 text-green-400"
            />
          </>
        )}
      </div>

      {!compact && (
        <div>
          <div className="text-5xl font-black tracking-tight">
            <span className="text-white">RISK</span>
            <span className="text-blue-400">CLIM</span>
            <span className="text-green-400">-MG</span>
          </div>
          <div className="mt-4 max-w-md text-lg font-extrabold uppercase leading-7 tracking-wide text-white">
            Système d’aide à la décision climatique géospatialisé
          </div>
          <div className="mt-7 h-1.5 w-24 rounded-full bg-gradient-to-r from-blue-400 to-green-400" />
        </div>
      )}
    </div>
  );
}

export default function LoginPage() {
  const navigate = useNavigate();
  const setAuth = useAppStore((state) => state.setAuth);

  const [showPassword, setShowPassword] = useState(false);
  const [serverError, setServerError] = useState('');

  const defaultValues = useMemo<LoginFormValues>(
    () => ({
      email: '',
      password: '',
      rememberMe: false,
    }),
    [],
  );

  const {
    control,
    handleSubmit,
    formState: { errors, isSubmitting, isValid },
    setError,
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues,
    mode: 'onChange',
  });

  const handlePaste = (event: ClipboardEvent<HTMLElement>) => {
    const pastedText = event.clipboardData.getData('text');

    if (containsSuspiciousScript(pastedText)) {
      event.preventDefault();
      setServerError('Contenu collé refusé pour des raisons de sécurité.');
    }
  };

  const onSubmit: SubmitHandler<LoginFormValues> = async (values) => {
    setServerError('');

    if (
      containsSuspiciousScript(values.email) ||
      containsSuspiciousScript(values.password)
    ) {
      setError('email', {
        type: 'manual',
        message: 'Contenu suspect détecté.',
      });
      return;
    }

    try {
      const result = await authService.login({
        email: values.email.trim(),
        password: values.password,
      });

      setAuth(result.accessToken, result.refreshToken, result.user);

      const redirectPath = getRedirectPathByRole(result.user.role?.name);
      navigate(redirectPath, { replace: true });
    } catch (error) {
      setServerError(getAuthErrorMessage(error));
    }
  };

  return (
    <main className="grid min-h-screen grid-cols-1 bg-slate-50 lg:grid-cols-[52%_48%]">
      <section
        className="relative hidden min-h-screen overflow-hidden bg-slate-950 text-white lg:block"
        aria-label="Présentation de RISKCLIM-MG"
      >
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{
            backgroundImage: 'url("/images/login-risk-bg.webp")',
          }}
        />

        <div className="absolute inset-0 bg-gradient-to-br from-slate-950/92 via-slate-950/62 to-slate-950/24" />
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-transparent to-slate-950/15" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_22%_16%,rgba(34,197,94,0.18),transparent_28%),radial-gradient(circle_at_72%_36%,rgba(59,130,246,0.18),transparent_30%)]" />

        <div className="relative z-10 flex min-h-screen flex-col px-16 py-14">
          <div>
            <LogoMark />
          </div>

          <div className="mt-auto max-w-2xl pb-8">
            <h1 className="text-5xl font-black leading-tight tracking-tight drop-shadow-xl">
              Anticiper aujourd’hui,
              <br />
              <span className="text-green-400">protéger</span> demain.
            </h1>

            <p className="mt-8 max-w-xl text-xl font-medium leading-9 text-slate-100 drop-shadow">
              RISKCLIM-MG est une plateforme intelligente qui intègre les
              données climatiques et géospatiales pour analyser les risques,
              alerter et guider les décisions pour un avenir plus résilient.
            </p>

            <div className="mt-12 grid grid-cols-4 gap-6">
              <div className="border-r border-white/15 pr-4">
                <MapPin className="mb-3 text-green-400" size={42} />
                <div className="text-base font-bold leading-6">
                  Cartographie
                  <br />
                  interactive
                </div>
              </div>

              <div className="border-r border-white/15 pr-4">
                <CloudRain className="mb-3 text-sky-400" size={42} />
                <div className="text-base font-bold leading-6">
                  Données climatiques
                  <br />
                  en temps réel
                </div>
              </div>

              <div className="border-r border-white/15 pr-4">
                <Bell className="mb-3 text-cyan-300" size={42} />
                <div className="text-base font-bold leading-6">
                  Alertes
                  <br />
                  intelligentes
                </div>
              </div>

              <div>
                <BarChart3 className="mb-3 text-green-400" size={42} />
                <div className="text-base font-bold leading-6">
                  Analyses et
                  <br />
                  indicateurs
                </div>
              </div>
            </div>

            <div className="mt-12 flex max-w-xl items-center gap-6 rounded-3xl border border-white/15 bg-slate-950/45 p-6 shadow-2xl shadow-black/25 backdrop-blur-md">
              <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl border border-green-400/30 bg-green-400/10 text-green-400">
                <ShieldCheck size={42} />
              </div>
              <p className="text-lg font-semibold leading-7 text-white">
                Des données fiables, des analyses précises,
                <br />
                pour des décisions éclairées.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="relative flex min-h-screen items-center justify-center overflow-hidden px-5 py-10 sm:px-8">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_25%_10%,rgba(34,197,94,0.10),transparent_28%),radial-gradient(circle_at_80%_30%,rgba(59,130,246,0.10),transparent_30%)]" />

        <div className="relative z-10 w-full max-w-xl">
          <div className="rounded-[2rem] border border-white/80 bg-white/92 px-8 py-10 shadow-2xl shadow-slate-900/10 backdrop-blur-xl sm:px-12 sm:py-12">
            <div className="mb-7 flex justify-center">
              <LogoMark compact />
            </div>

            <div className="mb-9 text-center">
              <h2 className="text-4xl font-black tracking-tight text-slate-900">
                Bienvenue !
              </h2>
              <p className="mt-3 text-lg text-slate-500">
                Connectez-vous pour accéder à votre espace
              </p>
            </div>

            {serverError && (
              <div
                role="alert"
                className="mb-6 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700"
              >
                {serverError}
              </div>
            )}

            <form noValidate onSubmit={handleSubmit(onSubmit)}>
              <Controller
                name="email"
                control={control}
                render={({ field }) => (
                  <div className="mb-6">
                    <label
                      htmlFor="login-email"
                      className="mb-3 block text-base font-extrabold text-slate-800"
                    >
                      Email
                    </label>

                    <div
                      className={[
                        'flex items-center rounded-xl border bg-white px-4 transition',
                        errors.email
                          ? 'border-red-400 ring-4 ring-red-50'
                          : 'border-slate-300 focus-within:border-green-500 focus-within:ring-4 focus-within:ring-green-100',
                      ].join(' ')}
                    >
                      <User className="mr-3 text-slate-500" size={23} />

                      <input
                        {...field}
                        id="login-email"
                        type="email"
                        autoComplete="email"
                        placeholder="Entrez votre email"
                        disabled={isSubmitting}
                        onPaste={handlePaste}
                        className="h-16 w-full bg-transparent text-base text-slate-900 outline-none placeholder:text-slate-400 disabled:cursor-not-allowed disabled:opacity-70"
                      />
                    </div>

                    {errors.email && (
                      <p className="mt-2 text-sm font-semibold text-red-600">
                        {errors.email.message}
                      </p>
                    )}
                  </div>
                )}
              />

              <Controller
                name="password"
                control={control}
                render={({ field }) => (
                  <div className="mb-5">
                    <label
                      htmlFor="login-password"
                      className="mb-3 block text-base font-extrabold text-slate-800"
                    >
                      Mot de passe
                    </label>

                    <div
                      className={[
                        'flex items-center rounded-xl border bg-white px-4 transition',
                        errors.password
                          ? 'border-red-400 ring-4 ring-red-50'
                          : 'border-slate-300 focus-within:border-green-500 focus-within:ring-4 focus-within:ring-green-100',
                      ].join(' ')}
                    >
                      <Lock className="mr-3 text-slate-500" size={23} />

                      <input
                        {...field}
                        id="login-password"
                        type={showPassword ? 'text' : 'password'}
                        autoComplete="current-password"
                        placeholder="Entrez votre mot de passe"
                        disabled={isSubmitting}
                        onPaste={handlePaste}
                        className="h-16 w-full bg-transparent text-base text-slate-900 outline-none placeholder:text-slate-400 disabled:cursor-not-allowed disabled:opacity-70"
                      />

                      <button
                        type="button"
                        aria-label={
                          showPassword
                            ? 'Masquer le mot de passe'
                            : 'Afficher le mot de passe'
                        }
                        onClick={() => setShowPassword((value) => !value)}
                        disabled={isSubmitting}
                        className="ml-3 rounded-lg p-2 text-slate-500 transition hover:bg-slate-100 hover:text-slate-800 focus:outline-none focus:ring-4 focus:ring-green-100 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {showPassword ? <EyeOff size={24} /> : <Eye size={24} />}
                      </button>
                    </div>

                    {errors.password && (
                      <p className="mt-2 text-sm font-semibold text-red-600">
                        {errors.password.message}
                      </p>
                    )}
                  </div>
                )}
              />

              <div className="mb-8 flex items-center justify-between gap-4">
                <Controller
                  name="rememberMe"
                  control={control}
                  render={({ field }) => (
                    <label className="flex cursor-pointer items-center gap-3 text-base text-slate-600">
                      <input
                        type="checkbox"
                        checked={field.value}
                        onChange={(event) => field.onChange(event.target.checked)}
                        disabled={isSubmitting}
                        className="h-5 w-5 rounded border-slate-300 text-green-600 focus:ring-green-500"
                      />
                      Se souvenir de moi
                    </label>
                  )}
                />

                <Link
                  to="/forgot-password"
                  className="text-base font-semibold text-blue-600 transition hover:text-blue-700 hover:underline focus:outline-none focus:ring-4 focus:ring-blue-100"
                >
                  Mot de passe oublié ?
                </Link>
              </div>

              <button
                type="submit"
                disabled={!isValid || isSubmitting}
                className="flex h-16 w-full items-center justify-center gap-3 rounded-xl bg-gradient-to-r from-green-500 via-teal-500 to-blue-600 text-lg font-extrabold text-white shadow-xl shadow-blue-900/15 transition hover:scale-[1.01] hover:shadow-2xl focus:outline-none focus:ring-4 focus:ring-green-100 disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:scale-100"
              >
                {isSubmitting ? (
                  <>
                    <span className="h-5 w-5 animate-spin rounded-full border-2 border-white/40 border-t-white" />
                    Connexion en cours...
                  </>
                ) : (
                  <>
                    <Lock size={23} />
                    Se connecter
                  </>
                )}
              </button>
            </form>

            <p className="mt-10 text-center text-base text-slate-500">
              Vous n’avez pas encore de compte ?{' '}
              <Link
                to="/contact-admin"
                className="font-extrabold text-blue-600 hover:underline"
              >
                Contactez l’administrateur
              </Link>
            </p>
          </div>

          <div className="mt-8 flex flex-col items-center justify-center gap-3 text-sm text-slate-500 sm:flex-row">
            <span>© 2026 RISKCLIM-MG</span>
            <span className="hidden h-5 w-px bg-slate-300 sm:block" />
            <span>Tous droits réservés</span>
            <span className="hidden h-5 w-px bg-slate-300 sm:block" />
            <span className="flex items-center gap-2">
              <ShieldCheck size={18} />
              Plateforme sécurisée
            </span>
          </div>
        </div>
      </section>
    </main>
  );
}
