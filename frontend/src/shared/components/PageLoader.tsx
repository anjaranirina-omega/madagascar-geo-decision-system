import React from 'react';
import { Loader2 } from 'lucide-react';

export default function PageLoader() {
  return (
    <div className="flex min-h-[400px] w-full items-center justify-center p-8">
      <div className="flex flex-col items-center gap-3">
        <Loader2 className="h-10 w-10 animate-spin text-purple-600 dark:text-purple-400" />
        <span className="text-sm font-semibold text-slate-500 dark:text-slate-400">
          Chargement du module...
        </span>
      </div>
    </div>
  );
}
