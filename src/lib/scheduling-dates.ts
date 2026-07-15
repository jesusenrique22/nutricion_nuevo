/** Fecha local YYYY-MM-DD a partir de un Date. */
export function toDateKey(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/** Lista inclusive de fechas YYYY-MM-DD entre from y to. */
export function dateRangeKeys(from: string, to: string): string[] {
  const [fy, fm, fd] = from.split("-").map(Number);
  const [ty, tm, td] = to.split("-").map(Number);
  const start = new Date(fy, fm - 1, fd);
  const end = new Date(ty, tm - 1, td);
  if (end < start) return [];

  const keys: string[] = [];
  const cursor = new Date(start);
  while (cursor <= end) {
    keys.push(toDateKey(cursor));
    cursor.setDate(cursor.getDate() + 1);
  }
  return keys;
}

export function todayDateKey(): string {
  return toDateKey(new Date());
}

/** Día de la semana 0–6 (domingo–sábado) para una clave YYYY-MM-DD local. */
export function weekdayFromDateKey(dateStr: string): number {
  const [y, m, d] = dateStr.split("-").map(Number);
  return new Date(y, m - 1, d).getDay();
}

/** Etiquetas en español, orden Lun→Dom para la UI. */
export const WEEKDAY_OPTIONS: { value: number; label: string; short: string }[] =
  [
    { value: 1, label: "Lunes", short: "Lun" },
    { value: 2, label: "Martes", short: "Mar" },
    { value: 3, label: "Miércoles", short: "Mié" },
    { value: 4, label: "Jueves", short: "Jue" },
    { value: 5, label: "Viernes", short: "Vie" },
    { value: 6, label: "Sábados", short: "Sáb" },
    { value: 0, label: "Domingos", short: "Dom" },
  ];

export function weekdayLabel(weekday: number): string {
  return WEEKDAY_OPTIONS.find((w) => w.value === weekday)?.label ?? `Día ${weekday}`;
}
