import Link from "next/link";

export function BrandDashboardHeader({
  eyebrow = "Anttova",
  title,
  description,
  action,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  action?: { href: string; label: string };
}) {
  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
      <div>
        <div className="flex flex-wrap items-center gap-3">
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-accent">
            {eyebrow}
          </p>
          <span className="hidden h-px w-8 bg-primary/20 sm:block" aria-hidden />
          <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-foreground/45">
            Tu proceso empieza aquí
          </p>
        </div>
        <h1 className="mt-2 text-2xl font-bold sm:text-3xl">{title}</h1>
        {description && (
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-foreground/65 sm:text-base">
            {description}
          </p>
        )}
      </div>
      {action && (
        <Link
          href={action.href}
          className="shrink-0 rounded-full border border-primary/25 px-5 py-2.5 text-sm font-semibold text-primary transition hover:bg-muted"
        >
          {action.label}
        </Link>
      )}
    </div>
  );
}

export function BrandStatGrid({
  items,
}: {
  items: { label: string; value: string | number; suffix?: string }[];
}) {
  return (
    <div className="overflow-hidden rounded-3xl bg-gradient-to-br from-accent-soft/40 via-muted/30 to-background ring-1 ring-primary/10">
      <div className="grid divide-y divide-primary/10 sm:grid-cols-3 sm:divide-x sm:divide-y-0">
        {items.map((item) => (
          <div key={item.label} className="px-6 py-8 sm:px-8">
            <p className="text-5xl font-extralight tabular-nums text-primary sm:text-6xl">
              {item.value}
              {item.suffix && (
                <span className="ml-1 text-2xl font-light">{item.suffix}</span>
              )}
            </p>
            <p className="mt-3 text-xs font-bold uppercase tracking-[0.18em] text-foreground/70">
              {item.label}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}

const RECIPE_SEGMENTS = [
  { label: "Alimentación", pct: 50, className: "bg-primary" },
  { label: "Ejercicio", pct: 30, className: "bg-[#5a1728]" },
  { label: "Descanso", pct: 10, className: "bg-foreground/75" },
  { label: "Mentalidad", pct: 10, className: "bg-accent-soft" },
];

export function BrandRecipePanel() {
  return (
    <section className="overflow-hidden rounded-3xl bg-surface ring-1 ring-primary/10">
      <div className="grid lg:grid-cols-[1fr_1.1fr]">
        <div className="border-b border-primary/10 p-6 sm:p-8 lg:border-b-0 lg:border-r">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-foreground/45">
            Receta para el éxito
          </p>
          <h2 className="mt-3 text-3xl font-extralight uppercase leading-tight text-primary sm:text-4xl">
            Tu
            <br />
            balance
          </h2>
          <p className="mt-4 text-sm leading-relaxed text-foreground/65">
            Anttova integra nutrición, movimiento y descanso para resultados
            sostenibles.
          </p>
        </div>
        <div className="p-6 sm:p-8">
          <div className="flex h-3 overflow-hidden rounded-full">
            {RECIPE_SEGMENTS.map((seg) => (
              <div
                key={seg.label}
                className={seg.className}
                style={{ width: `${seg.pct}%` }}
                title={`${seg.label} ${seg.pct}%`}
              />
            ))}
          </div>
          <ul className="mt-6 space-y-3">
            {RECIPE_SEGMENTS.map((seg) => (
              <li
                key={seg.label}
                className="flex items-center justify-between gap-3 text-sm"
              >
                <span className="flex items-center gap-2.5 text-foreground/75">
                  <span
                    className={`h-2.5 w-2.5 shrink-0 rounded-full ${seg.className}`}
                  />
                  {seg.label}
                </span>
                <span className="font-bold tabular-nums text-primary">
                  {seg.pct}%
                </span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}

export function BrandDataTable({
  columns,
  rows,
  emptyMessage,
}: {
  columns: { key: string; label: string; className?: string }[];
  rows: Record<string, React.ReactNode>[];
  emptyMessage?: string;
}) {
  if (rows.length === 0 && emptyMessage) {
    return (
      <div className="rounded-3xl border border-primary/10 bg-surface px-6 py-12 text-center text-sm text-foreground/55">
        {emptyMessage}
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-3xl ring-1 ring-primary/10">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[640px] text-left text-sm">
          <thead>
            <tr className="bg-primary text-primary-foreground">
              {columns.map((col) => (
                <th
                  key={col.key}
                  className={`px-5 py-3.5 text-xs font-bold uppercase tracking-wider ${col.className ?? ""}`}
                >
                  {col.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="bg-surface">
            {rows.map((row, i) => (
              <tr
                key={i}
                className="border-t border-primary/10 last:border-b-0"
              >
                {columns.map((col) => (
                  <td
                    key={col.key}
                    className={`px-5 py-3.5 text-foreground/80 ${col.className ?? ""}`}
                  >
                    {row[col.key] ?? "—"}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export function BrandMetricCard({
  label,
  value,
  unit,
  date,
}: {
  label: string;
  value: string | number;
  unit?: string;
  date?: string;
}) {
  return (
    <div className="rounded-3xl bg-surface p-6 ring-1 ring-primary/10">
      <p className="text-xs font-bold uppercase tracking-[0.16em] text-foreground/50">
        {label}
      </p>
      <p className="mt-3 text-4xl font-extralight tabular-nums text-primary">
        {value}
        {unit && (
          <span className="ml-1 text-lg font-light text-foreground/60">
            {unit}
          </span>
        )}
      </p>
      {date && (
        <p className="mt-2 text-xs text-foreground/45">{date}</p>
      )}
    </div>
  );
}

export function BrandQuickLinks({
  items,
}: {
  items: { href: string; title: string; desc: string; index: string }[];
}) {
  return (
    <section>
      <h2 className="text-xs font-bold uppercase tracking-[0.22em] text-foreground/50">
        Accesos
      </h2>
      <div className="mt-4 divide-y divide-primary/10 overflow-hidden rounded-3xl bg-surface ring-1 ring-primary/10">
        {items.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="flex items-center gap-4 px-5 py-4 transition hover:bg-muted/30 sm:px-6 sm:py-5"
          >
            <span className="text-2xl font-extralight tabular-nums text-accent sm:text-3xl">
              {item.index}
            </span>
            <div className="min-w-0 flex-1">
              <p className="font-semibold text-primary">{item.title}</p>
              <p className="mt-0.5 text-sm text-foreground/55">{item.desc}</p>
            </div>
            <span className="text-primary/40" aria-hidden>
              →
            </span>
          </Link>
        ))}
      </div>
    </section>
  );
}
