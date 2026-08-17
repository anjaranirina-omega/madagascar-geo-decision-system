export type LineChartPoint = {
  label: string;
  value: number;
};

export default function SimpleLineChart({
  points,
}: {
  points: LineChartPoint[];
}) {
  if (points.length === 0) {
    return (
      <div className="flex h-56 items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-slate-50 dark:bg-slate-800 text-sm font-semibold text-slate-400 dark:text-slate-500 dark:border-slate-700 dark:bg-slate-900">
        Aucune série temporelle disponible.
      </div>
    );
  }

  const width = 700;
  const height = 220;
  const padding = 30;

  const values = points.map((point) => point.value);
  const min = Math.min(...values);
  const max = Math.max(...values);

  const normalizeY = (value: number) => {
    if (max === min) return height / 2;

    return (
      height -
      padding -
      ((value - min) / (max - min)) * (height - padding * 2)
    );
  };

  const stepX =
    points.length > 1 ? (width - padding * 2) / (points.length - 1) : 0;

  const polyline = points
    .map((point, index) => {
      const x = padding + index * stepX;
      const y = normalizeY(point.value);

      return `${x},${y}`;
    })
    .join(' ');

  const area = `${padding},${height - padding} ${polyline} ${
    width - padding
  },${height - padding}`;

  const last = points[points.length - 1];

  return (
    <div className="rounded-2xl border border-slate-100 dark:border-slate-800 bg-gradient-to-br from-white to-blue-50/50 p-3 dark:border-slate-800 dark:from-slate-950 dark:to-slate-900">
      <svg viewBox={`0 0 ${width} ${height}`} className="h-56 w-full">
        <defs>
          <linearGradient id="riskLineGradient" x1="0" x2="1">
            <stop offset="0%" stopColor="#2563eb" />
            <stop offset="100%" stopColor="#22c55e" />
          </linearGradient>

          <linearGradient id="riskAreaGradient" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="#2563eb" stopOpacity="0.22" />
            <stop offset="100%" stopColor="#2563eb" stopOpacity="0.02" />
          </linearGradient>
        </defs>

        {[0, 1, 2, 3].map((item) => {
          const y = padding + item * ((height - padding * 2) / 3);

          return (
            <line
              key={item}
              x1={padding}
              y1={y}
              x2={width - padding}
              y2={y}
              stroke="#e2e8f0"
              strokeDasharray="4 4"
            />
          );
        })}

        <polygon points={area} fill="url(#riskAreaGradient)" />

        <polyline
          points={polyline}
          fill="none"
          stroke="url(#riskLineGradient)"
          strokeWidth="4"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {points.map((point, index) => {
          const x = padding + index * stepX;
          const y = normalizeY(point.value);

          return (
            <circle
              key={`${point.label}-${index}`}
              cx={x}
              cy={y}
              r={4}
              fill="#2563eb"
              stroke="white"
              strokeWidth="2"
            />
          );
        })}

        <text
          x={width - padding}
          y={normalizeY(last.value) - 12}
          textAnchor="end"
          fontSize="14"
          fontWeight="800"
          fill="#2563eb"
        >
          {last.value.toFixed(1)}
        </text>
      </svg>
    </div>
  );
}
