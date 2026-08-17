import { ReactNode } from 'react';

type SectionCardProps = {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
};

export default function SectionCard({
  title,
  subtitle,
  actions,
  children,
  className = '',
}: SectionCardProps) {
  return (
    <section
      className={[
        'relative overflow-hidden rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm',
        'dark:border-slate-800 dark:bg-slate-900/90 dark:shadow-lg dark:shadow-slate-950/30',
        className,
      ].join(' ')}
    >
      <div className="absolute -right-16 -top-16 h-40 w-40 rounded-full bg-blue-500/5 blur-3xl dark:bg-blue-500/10" />
      <div className="absolute -bottom-16 left-1/4 h-40 w-40 rounded-full bg-emerald-500/5 blur-3xl dark:bg-emerald-500/10" />

      <div className="relative mb-5 flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div>
          <h3 className="text-lg font-black tracking-tight text-slate-950 dark:text-white">
            {title}
          </h3>

          {subtitle && (
            <p className="mt-1 max-w-3xl text-sm leading-6 text-slate-500 dark:text-slate-400">
              {subtitle}
            </p>
          )}
        </div>

        {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
      </div>

      <div className="relative">{children}</div>
    </section>
  );
}
