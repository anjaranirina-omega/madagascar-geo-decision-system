type TabItem<T extends string> = {
  id: T;
  label: string;
  count?: number;
};

type TabsProps<T extends string> = {
  tabs: TabItem<T>[];
  active: T;
  onChange: (value: T) => void;
};

export default function Tabs<T extends string>({
  tabs,
  active,
  onChange,
}: TabsProps<T>) {
  return (
    <div className="rounded-[1.5rem] border border-slate-200 bg-white p-2 shadow-sm dark:border-slate-800 dark:bg-slate-900/90">
      <div className="flex flex-wrap gap-2">
        {tabs.map((tab) => {
          const isActive = tab.id === active;

          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => onChange(tab.id)}
              className={[
                'group inline-flex items-center rounded-2xl px-4 py-2.5 text-sm font-black transition-all',
                isActive
                  ? 'bg-gradient-to-r from-blue-600 to-emerald-500 text-white shadow-lg shadow-blue-900/10'
                  : 'text-slate-600 hover:bg-slate-100 hover:text-slate-950 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white',
              ].join(' ')}
            >
              {tab.label}

              {typeof tab.count === 'number' && (
                <span
                  className={[
                    'ml-2 rounded-full px-2 py-0.5 text-xs font-black',
                    isActive
                      ? 'bg-white/20 text-white'
                      : 'bg-slate-100 text-slate-500 group-hover:bg-white dark:bg-slate-800 dark:text-slate-300 dark:group-hover:bg-slate-700',
                  ].join(' ')}
                >
                  {tab.count}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
