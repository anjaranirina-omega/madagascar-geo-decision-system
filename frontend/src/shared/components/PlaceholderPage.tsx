export default function PlaceholderPage({ title }: { title: string }) {
  return (
    <div className="card p-8">
      <h2 className="text-2xl font-black text-slate-900">{title}</h2>
      <p className="mt-2 text-slate-500">
        Interface en cours de développement selon la maquette RISKLIM-MG.
      </p>
    </div>
  );
}
