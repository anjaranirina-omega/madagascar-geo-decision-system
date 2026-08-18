export type BarChartItem = {
  label: string;
  value: number;
  color?: string;
  hint?: string;
};

export default function SimpleBarChart({ items }: { items: BarChartItem[] }) {
  const max = Math.max(...items.map((item) => item.value), 1);

  return (
    <div className="space-y-4">
      {items.map((item) => {
        const percent = Math.max((item.value / max) * 100, 3);

        return (
          <div key={item.label}>
            <div className="mb-1.5 flex items-center justify-between gap-3">
              <div>
                <div className="text-sm font-black text-slate-800 dark:text-slate-100 dark:text-slate-100">
                  {item.label}
                </div>
                {item.hint && (
                  <div className="text-[11px] font-medium text-slate-400 dark:text-slate-500">
                    {item.hint}
                  </div>
                )}
              </div>

              <div className="text-sm font-black text-slate-950 dark:text-white dark:text-white">
                {item.value.toFixed(1)}
              </div>
            </div>

            <div className="h-3 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
              <div
                className={[
                  'h-full rounded-full shadow-sm transition-all duration-500',
                  item.color ?? 'bg-blue-600',
                ].join(' ')}
                style={{ width: `${percent}%` }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}
