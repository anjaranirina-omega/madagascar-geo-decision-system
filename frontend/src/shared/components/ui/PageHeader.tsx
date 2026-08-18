import { ReactNode } from 'react';

type PageHeaderProps = {
  title: string;
  subtitle?: string;
  icon?: ReactNode;
  actions?: ReactNode;
};

export default function PageHeader({
  title,
  subtitle,
  icon,
  actions,
}: PageHeaderProps) {
  return (
    <section className="relative overflow-hidden rounded-[2rem] border border-slate-200 bg-gradient-to-br from-slate-950 via-slate-900 to-blue-950 p-7 text-white shadow-xl shadow-slate-900/10 dark:border-slate-800">
      <div className="absolute -right-24 -top-24 h-72 w-72 rounded-full bg-blue-500/25 blur-3xl" />
      <div className="absolute -bottom-28 left-1/3 h-72 w-72 rounded-full bg-emerald-500/20 blur-3xl" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(255,255,255,0.08),transparent_32%)]" />

      <div className="relative flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-start gap-4">
          {icon && (
            <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-3xl bg-white/10 text-emerald-300 shadow-lg ring-1 ring-white/10 backdrop-blur">
              {icon}
            </div>
          )}

          <div>
            <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/10 px-3 py-1 text-xs font-black uppercase tracking-wide text-emerald-100">
              RISKCLIM-MG
              <span className="h-1 w-1 rounded-full bg-emerald-300" />
              Décision spatiale
            </div>

            <h2 className="text-3xl font-black tracking-tight text-white">
              {title}
            </h2>

            {subtitle && (
              <p className="mt-2 max-w-4xl text-sm leading-6 text-slate-300">
                {subtitle}
              </p>
            )}
          </div>
        </div>

        {actions && <div className="flex flex-wrap gap-3">{actions}</div>}
      </div>
    </section>
  );
}
