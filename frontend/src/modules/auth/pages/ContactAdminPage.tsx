import { zodResolver } from '@hookform/resolvers/zod';
import {
  ArrowLeft,
  Building2,
  CheckCircle2,
  Mail,
  Phone,
  Send,
  ShieldCheck,
  UserCog,
} from 'lucide-react';
import { Controller, SubmitHandler, useForm } from 'react-hook-form';
import { Link } from 'react-router-dom';
import { z } from 'zod';
import { accountRequestService } from '../account-request.service';

const schema = z.object({
  fullName: z.string().min(2, 'Le nom complet est obligatoire.'),
  organization: z.string().min(2, 'L’organisation est obligatoire.'),
  position: z.string().min(2, 'La fonction est obligatoire.'),
  requestedRole: z.enum(['DECIDEUR', 'ANALYSTE', 'AGENT_TERRAIN']),
  email: z
    .string()
    .trim()
    .min(1, 'L’email est obligatoire.')
    .email('Veuillez saisir une adresse email valide.'),
  phone: z.string().optional(),
  justification: z
    .string()
    .min(10, 'Veuillez préciser la justification de la demande.'),
});

type FormValues = z.infer<typeof schema>;

const roleLabels: Record<FormValues['requestedRole'], string> = {
  DECIDEUR: 'Décideur',
  ANALYSTE: 'Analyste',
  AGENT_TERRAIN: 'Agent de terrain',
};

export default function ContactAdminPage() {
  const {
    control,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting, isValid },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    mode: 'onChange',
    defaultValues: {
      fullName: '',
      organization: '',
      position: '',
      requestedRole: 'ANALYSTE',
      email: '',
      phone: '',
      justification: '',
    },
  });

  const onSubmit: SubmitHandler<FormValues> = async (values) => {
    await accountRequestService.create(values);
    reset();

    alert('Votre demande a été envoyée à l’administrateur.');
  };

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-slate-50 px-5 py-10">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_10%,rgba(34,197,94,0.10),transparent_30%),radial-gradient(circle_at_80%_20%,rgba(59,130,246,0.10),transparent_32%)]" />

      <div className="relative z-10 grid w-full max-w-7xl grid-cols-1 overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-2xl shadow-slate-900/10 lg:grid-cols-[38%_62%]">
        <section className="relative hidden min-h-[760px] bg-slate-950 p-10 text-white lg:block">
          <div
            className="absolute inset-0 bg-cover bg-center"
            style={{
              backgroundImage: 'url("/images/login-risk-bg.webp")',
            }}
          />
          <div className="absolute inset-0 bg-gradient-to-br from-slate-950/92 via-slate-950/72 to-slate-950/36" />

          <div className="relative z-10 flex h-full flex-col justify-between">
            <div>
              <div className="mb-8 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-green-500 to-blue-600">
                <UserCog size={34} />
              </div>

              <h1 className="text-4xl font-black leading-tight">
                Demande d’accès
                <br />
                à RISKCLIM-MG
              </h1>

              <p className="mt-6 max-w-sm text-lg leading-8 text-slate-200">
                Remplissez le formulaire. L’administrateur recevra votre demande
                par email et pourra créer votre compte selon le rôle demandé.
              </p>
            </div>

            <div className="rounded-3xl border border-white/15 bg-white/10 p-6 backdrop-blur">
              <div className="flex items-start gap-4">
                <ShieldCheck className="mt-1 text-green-400" size={32} />
                <p className="text-base leading-7 text-slate-100">
                  Les accès sont réservés aux acteurs habilités : autorités,
                  analystes, décideurs et agents opérationnels.
                </p>
              </div>
            </div>
          </div>
        </section>

        <section className="p-8 sm:p-12">
          <div className="mb-8">
            <div className="mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-green-500 to-blue-600 text-white">
              <ShieldCheck size={34} />
            </div>

            <h2 className="text-3xl font-black text-slate-900">
              Contacter l’administrateur
            </h2>

            <p className="mt-4 max-w-2xl leading-7 text-slate-600">
              Complétez les informations ci-dessous. Votre demande sera envoyée
              automatiquement à l’administrateur de la plateforme.
            </p>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            <div className="grid gap-5 sm:grid-cols-2">
              <Controller
                name="fullName"
                control={control}
                render={({ field }) => (
                  <Field
                    label="Nom complet"
                    error={errors.fullName?.message}
                    icon={<UserCog size={20} />}
                  >
                    <input {...field} className="field-input" />
                  </Field>
                )}
              />

              <Controller
                name="email"
                control={control}
                render={({ field }) => (
                  <Field
                    label="Email professionnel"
                    error={errors.email?.message}
                    icon={<Mail size={20} />}
                  >
                    <input {...field} type="email" className="field-input" />
                  </Field>
                )}
              />
            </div>

            <div className="grid gap-5 sm:grid-cols-2">
              <Controller
                name="organization"
                control={control}
                render={({ field }) => (
                  <Field
                    label="Organisation / Institution"
                    error={errors.organization?.message}
                    icon={<Building2 size={20} />}
                  >
                    <input {...field} className="field-input" />
                  </Field>
                )}
              />

              <Controller
                name="position"
                control={control}
                render={({ field }) => (
                  <Field
                    label="Fonction"
                    error={errors.position?.message}
                    icon={<CheckCircle2 size={20} />}
                  >
                    <input {...field} className="field-input" />
                  </Field>
                )}
              />
            </div>

            <div className="grid gap-5 sm:grid-cols-2">
              <Controller
                name="requestedRole"
                control={control}
                render={({ field }) => (
                  <Field
                    label="Rôle souhaité"
                    error={errors.requestedRole?.message}
                    icon={<ShieldCheck size={20} />}
                  >
                    <select {...field} className="field-input">
                      {Object.entries(roleLabels).map(([value, label]) => (
                        <option key={value} value={value}>
                          {label}
                        </option>
                      ))}
                    </select>
                  </Field>
                )}
              />

              <Controller
                name="phone"
                control={control}
                render={({ field }) => (
                  <Field
                    label="Téléphone"
                    error={errors.phone?.message}
                    icon={<Phone size={20} />}
                  >
                    <input {...field} className="field-input" />
                  </Field>
                )}
              />
            </div>

            <Controller
              name="justification"
              control={control}
              render={({ field }) => (
                <Field
                  label="Justification de la demande"
                  error={errors.justification?.message}
                  icon={<ShieldCheck size={20} />}
                >
                  <textarea
                    {...field}
                    rows={5}
                    className="field-input resize-none py-3"
                  />
                </Field>
              )}
            />

            <div className="mt-8 flex flex-col gap-4 sm:flex-row sm:items-center">
              <button
                type="submit"
                disabled={!isValid || isSubmitting}
                className="inline-flex h-14 items-center justify-center gap-3 rounded-xl bg-gradient-to-r from-green-500 to-blue-600 px-6 font-extrabold text-white shadow-xl shadow-blue-900/10 transition hover:scale-[1.01] disabled:cursor-not-allowed disabled:opacity-60"
              >
                <Send size={20} />
                {isSubmitting ? 'Envoi en cours...' : 'Envoyer la demande'}
              </button>

              <Link
                to="/login"
                className="inline-flex h-14 items-center justify-center gap-2 rounded-xl border border-slate-300 px-6 font-bold text-slate-700 transition hover:bg-slate-50"
              >
                <ArrowLeft size={18} />
                Retour à la connexion
              </Link>
            </div>
          </form>
        </section>
      </div>
    </main>
  );
}

function Field({
  label,
  error,
  icon,
  children,
}: {
  label: string;
  error?: string;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="mb-2 block font-bold text-slate-800">{label}</label>
      <div
        className={[
          'flex items-center gap-3 rounded-xl border bg-white px-4 text-slate-600 transition focus-within:border-green-500 focus-within:ring-4 focus-within:ring-green-100',
          error ? 'border-red-400 ring-4 ring-red-50' : 'border-slate-300',
        ].join(' ')}
      >
        {icon}
        {children}
      </div>
      {error && (
        <p className="mt-2 text-sm font-semibold text-red-600">{error}</p>
      )}
    </div>
  );
}
