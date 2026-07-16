import { zodResolver } from '@hookform/resolvers/zod';
import { ArrowLeft, Eye, EyeOff, Lock, ShieldCheck } from 'lucide-react';
import { useState } from 'react';
import { Controller, SubmitHandler, useForm } from 'react-hook-form';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { z } from 'zod';
import { authService } from '../auth.service';

const schema = z
  .object({
    newPassword: z
      .string()
      .min(6, 'Le mot de passe doit contenir au moins 6 caractères.'),
    confirmPassword: z.string().min(1, 'Veuillez confirmer le mot de passe.'),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: 'Les mots de passe ne correspondent pas.',
    path: ['confirmPassword'],
  });

type FormValues = z.infer<typeof schema>;

export default function ResetPasswordPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const token = searchParams.get('token') ?? '';

  const [showPassword, setShowPassword] = useState(false);
  const [serverMessage, setServerMessage] = useState('');
  const [serverError, setServerError] = useState('');

  const {
    control,
    handleSubmit,
    formState: { errors, isSubmitting, isValid },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      newPassword: '',
      confirmPassword: '',
    },
    mode: 'onChange',
  });

  const onSubmit: SubmitHandler<FormValues> = async (values) => {
    setServerError('');
    setServerMessage('');

    if (!token) {
      setServerError('Token de réinitialisation manquant.');
      return;
    }

    try {
      const result = await authService.resetPassword(
        token,
        values.newPassword,
      );

      setServerMessage(result.message);

      setTimeout(() => {
        navigate('/login', { replace: true });
      }, 1600);
    } catch {
      setServerError('Lien invalide ou expiré.');
    }
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 px-5">
      <div className="w-full max-w-lg rounded-3xl border border-slate-200 bg-white p-10 shadow-2xl shadow-slate-900/10">
        <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-green-500 to-blue-600 text-white">
          <ShieldCheck size={34} />
        </div>

        <h1 className="text-3xl font-black text-slate-900">
          Nouveau mot de passe
        </h1>

        <p className="mt-4 leading-7 text-slate-600">
          Définissez un nouveau mot de passe sécurisé pour votre compte.
        </p>

        {serverError && (
          <div className="mt-6 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
            {serverError}
          </div>
        )}

        {serverMessage && (
          <div className="mt-6 rounded-2xl border border-green-200 bg-green-50 px-4 py-3 text-sm font-semibold text-green-700">
            {serverMessage}
          </div>
        )}

        <form onSubmit={handleSubmit(onSubmit)} className="mt-8 space-y-5">
          <Controller
            name="newPassword"
            control={control}
            render={({ field }) => (
              <div>
                <label className="mb-3 block font-bold text-slate-800">
                  Nouveau mot de passe
                </label>

                <div className="flex items-center rounded-xl border border-slate-300 px-4 focus-within:border-green-500 focus-within:ring-4 focus-within:ring-green-100">
                  <Lock className="mr-3 text-slate-500" size={22} />
                  <input
                    {...field}
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Nouveau mot de passe"
                    className="h-14 w-full bg-transparent outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((value) => !value)}
                    className="rounded-lg p-2 text-slate-500 hover:bg-slate-100"
                  >
                    {showPassword ? <EyeOff size={22} /> : <Eye size={22} />}
                  </button>
                </div>

                {errors.newPassword && (
                  <p className="mt-2 text-sm font-semibold text-red-600">
                    {errors.newPassword.message}
                  </p>
                )}
              </div>
            )}
          />

          <Controller
            name="confirmPassword"
            control={control}
            render={({ field }) => (
              <div>
                <label className="mb-3 block font-bold text-slate-800">
                  Confirmer le mot de passe
                </label>

                <div className="flex items-center rounded-xl border border-slate-300 px-4 focus-within:border-green-500 focus-within:ring-4 focus-within:ring-green-100">
                  <Lock className="mr-3 text-slate-500" size={22} />
                  <input
                    {...field}
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Confirmez le mot de passe"
                    className="h-14 w-full bg-transparent outline-none"
                  />
                </div>

                {errors.confirmPassword && (
                  <p className="mt-2 text-sm font-semibold text-red-600">
                    {errors.confirmPassword.message}
                  </p>
                )}
              </div>
            )}
          />

          <button
            type="submit"
            disabled={!isValid || isSubmitting || !token}
            className="flex h-14 w-full items-center justify-center rounded-xl bg-gradient-to-r from-green-500 to-blue-600 font-extrabold text-white transition hover:scale-[1.01] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isSubmitting ? 'Réinitialisation...' : 'Réinitialiser le mot de passe'}
          </button>
        </form>

        <Link
          to="/login"
          className="mt-8 inline-flex items-center gap-2 font-bold text-green-700 hover:underline"
        >
          <ArrowLeft size={18} />
          Retour à la connexion
        </Link>
      </div>
    </main>
  );
}
