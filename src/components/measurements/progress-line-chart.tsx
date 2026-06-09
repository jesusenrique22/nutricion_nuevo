export interface ChartPoint {
  label: string;
  value: number;
}

export function ProgressLineChart({
  title,
  unit,
  data,
  color = "#741e31",
}: {
  title: string;
  unit: string;
  data: ChartPoint[];
  color?: string;
}) {
  if (data.length === 0) return null;

  const width = 480;
  const height = 180;
  const padX = 48;
  const padY = 32;

  const values = data.map((d) => d.value);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  const paddedMin = min - range * 0.1;
  const paddedMax = max + range * 0.1;
  const paddedRange = paddedMax - paddedMin;

  const points = data.map((d, i) => {
    const x =
      padX +
      (data.length === 1 ? 0 : i / (data.length - 1)) * (width - padX * 2);
    const y =
      height -
      padY -
      ((d.value - paddedMin) / paddedRange) * (height - padY * 2);
    return { x, y, label: d.label, value: d.value };
  });

  const pathD =
    data.length === 1
      ? ""
      : points.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`).join(" ");

  const latest = data[data.length - 1];

  return (
    <div className="overflow-hidden rounded-3xl bg-surface ring-1 ring-primary/10">
      <div className="border-b border-primary/10 px-5 py-4 sm:px-6">
        <div className="flex items-baseline justify-between gap-2">
          <h3 className="text-xs font-bold uppercase tracking-[0.16em] text-foreground/55">
            {title}
          </h3>
          <span className="text-sm text-foreground/50">
            Último:{" "}
            <strong className="font-semibold text-primary">
              {latest.value} {unit}
            </strong>
          </span>
        </div>
      </div>

      <div className="p-5 sm:p-6">
      {data.length < 2 ? (
        <p className="mt-6 text-center text-sm text-foreground/50">
          Registra otra medición para ver la evolución.
        </p>
      ) : (
        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="mt-4 w-full"
          role="img"
          aria-label={`Gráfica de ${title}`}
        >
          <line
            x1={padX}
            y1={height - padY}
            x2={width - padX}
            y2={height - padY}
            stroke="#e5e7eb"
            strokeWidth="1"
          />
          <path
            d={pathD}
            fill="none"
            stroke={color}
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          {points.map((p, i) => (
            <g key={i}>
              <circle cx={p.x} cy={p.y} r="5" fill={color} />
              <text
                x={p.x}
                y={height - 8}
                textAnchor="middle"
                fontSize="10"
                fill="#6b7280"
              >
                {p.label}
              </text>
            </g>
          ))}
        </svg>
      )}
      </div>
    </div>
  );
}

export function buildChartPoints(
  measurements: {
    measuredAt: string;
    value: number | null;
  }[],
): ChartPoint[] {
  return measurements
    .filter((m): m is { measuredAt: string; value: number } => m.value != null)
    .sort(
      (a, b) =>
        new Date(a.measuredAt).getTime() - new Date(b.measuredAt).getTime(),
    )
    .map((m) => ({
      label: new Date(m.measuredAt).toLocaleDateString("es", {
        day: "2-digit",
        month: "short",
      }),
      value: m.value,
    }));
}
