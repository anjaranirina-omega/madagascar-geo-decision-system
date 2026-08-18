import { ReactNode } from 'react';

type Tone = 'blue' | 'green' | 'orange' | 'red' | 'slate' | 'purple';

const toneClasses: Record<Tone, string> = {
  blue: 'from-blue-600 to-cyan-500',
  green: 'from-emerald-600 to-green-500',
  orange: 'from-orange-500 to-amber-500',
  red: 'from-red-600 to-orange-500',
  slate: 'from-slate-700 to-slate-950',
  purple: 'from-purple-600 to-indigo-600',
};

const darkGlow: Record<Tone, string> = {
  blue: 'dark:shadow-blue-500/10',
  green: 'dark:shadow-emerald-500/10',
  orange: 'dark:shadow-orange-500/10',
  red: 'dark:shadow-red-500/10',
  slate: 'dark:shadow-slate-500/10',
  purple: 'dark:shadow-purple-500/10',
};

type KpiCardProps = {
  title: string;
  value: string | number;
  suffix?: string;
  subtitle?: string;
  icon?: ReactNode;
  tone?: Tone;
};

export default function KpiCard({
  title,
  value,
  suffix,
  subtitle,
  icon,
  tone = 'blue',
}: KpiCardProps) {
  return (
    <div
      className={[
        'group relative overflow-hidden rounded-[1.75rem] border border-slate-200 bg-white p-5 shadow-sm transition duration-200 hover:-translate-y-1 hover:border-blue-200 hover:shadow-xl',
        'dark:border-slate-800 dark:bg-slate-900/90 dark:shadow-lg',
        darkGlow[tone],
      ].join(' ')}
    >
      <div
        className={[
          'absolute inset-x-0 top-0 h-1 bg-gradient-to-r',
          toneClasses[tone],
        ].join(' ')}
      />

      <div
        className={[
          'absolute -right-10 -top-10 h-28 w-28 rounded-full opacity-20 blur-3xl bg-gradient-to-br dark:opacity-30',
          toneClasses[tone],
        ].join(' ')}
      />

      <div className="relative mb-4 flex items-start justify-between gap-3">
        <div className="text-sm font-black text-slate-500 dark:text-slate-400">
          {title}
        </div>

        {icon && (
          <div
            className={[
              'flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br text-white shadow-md',
              toneClasses[tone],
            ].join(' ')}
          >
            {icon}
          </div>
        )}
      </div>

      <div className="relative">
        <span className="text-3xl font-black tracking-tight text-slate-950 dark:text-white">
          {value}
        </span>

        {suffix && (
          <span className="ml-1 text-sm font-bold text-slate-400 dark:text-slate-500">
            {suffix}
          </span>
        )}
      </div>

      {subtitle && (
        <div className="relative mt-2 text-xs font-semibold leading-5 text-slate-500 dark:text-slate-400">
          {subtitle}
        </div>
      )}

      <div className="relative mt-4 h-1.5 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
        <div
          className={[
            'h-full w-2/3 rounded-full bg-gradient-to-r transition-all group-hover:w-full',
            toneClasses[tone],
          ].join(' ')}
        />
      </div>
    </div>
  );
}
