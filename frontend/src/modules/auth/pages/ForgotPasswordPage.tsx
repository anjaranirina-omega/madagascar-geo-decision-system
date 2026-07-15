import { zodResolver } from '@hookform/resolvers/zod';
import { ArrowLeft, Mail, ShieldCheck } from 'lucide-react';
import { useState } from 'react';
import { Controller, SubmitHandler, useForm } from 'react-hook-form';
import { Link } from 'react-router-dom';
import { z } from 'zod';
import { authService } from '../auth.service';

const schema = z.object({
  email: z
    .string()
    .trim()
    .min(1, 'L’email est obligatoire.')
    .email('Veuillez saisir une adresse email valide.'),
});

type FormValues = z.infer<typeof schema>;

export default function ForgotPasswordPage() {
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const {
    control,
    handleSubmit,
    formState: { errors, isSubmitting, isValid },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      email: '',
    },
    mode: 'onChange',
  });

  const onSubmit: SubmitHandler<FormValues> = async (values) => {
    setError('');
    setMessage('');

    try {
      const result = await authService.forgotPassword(values.email);
      setMessage(
        result.message ||
          'Si cet email existe, un lien de réinitialisation a été envoyé.',
      );
    } catch {
      setError('Impossible de traiter la demande pour le moment.');
    }
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 px-5">
      <div className="w-full max-w-lg rounded-3xl border border-slate-200 bg-white p-10 shadow-2xl shadow-slate-900/10">
        <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-green-500 to-blue-600 text-white">
          <ShieldCheck size={34} />
        </div>

        <h1 className="text-3xl font-black text-slate-900">
          Mot de passe oublié ?
        </h1>

        <p className="mt-4 leading-7 text-slate-600">
          Entrez votre email. Si ce compte existe, un lien sécurisé de
          réinitialisation sera envoyé à cette adresse.
        </p>

        {error && (
          <div className="mt-6 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
            {error}
          </div>
        )}

        {/* {message && (
          <div className="mt-6 rounded-2xl border border-green-200 bg-green-50 px-4 py-3 text-sm font-semibold text-green-700">
            {message}
            <div className="mt-2 text-green-800">
              Vérifiez votre boîte de réception ainsi que le dossier spam.
            </div>
          </div>
        )} */}

        <form onSubmit={handleSubmit(onSubmit)} className="mt-8">
          <Controller
            name="email"
            control={control}
            render={({ field }) => (
              <div>
                <label
                  htmlFor="forgot-email"
                  className="mb-3 block font-bold text-slate-800"
                >
                  Email
                </label>

                <div className="flex items-center rounded-xl border border-slate-300 px-4 focus-within:border-green-500 focus-within:ring-4 focus-within:ring-green-100">
                  <Mail className="mr-3 text-slate-500" size={22} />
                  <input
                    {...field}
                    id="forgot-email"
                    type="email"
                    placeholder="Entrez votre email"
                    disabled={isSubmitting}
                    className="h-14 w-full bg-transparent outline-none disabled:cursor-not-allowed disabled:opacity-70"
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

          <button
            type="submit"
            disabled={!isValid || isSubmitting}
            className="mt-6 flex h-14 w-full items-center justify-center rounded-xl bg-gradient-to-r from-green-500 to-blue-600 font-extrabold text-white transition hover:scale-[1.01] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isSubmitting ? 'Envoi du lien...' : 'Envoyer le lien de réinitialisation'}
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
