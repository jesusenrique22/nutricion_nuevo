/** Campos de ficha del paciente que se sincronizan desde formularios. */
export function parseGender(value: unknown): string | null {
  if (value == null) return null;
  const s = String(value).trim();
  return s.length ? s : null;
}

export function parseHeight(value: unknown): number | null {
  if (value == null || value === "") return null;
  const n = Number(value);
  if (Number.isNaN(n) || n < 50 || n > 250) return null;
  return Math.round(n);
}

/** Extrae género y estatura de un payload plano de formulario. */
export function demographicsFromPayload(data: Record<string, unknown>): {
  gender: string | null;
  height: number | null;
} {
  const extended =
    data.extendedPayload &&
    typeof data.extendedPayload === "object" &&
    !Array.isArray(data.extendedPayload)
      ? (data.extendedPayload as Record<string, unknown>)
      : null;

  return {
    gender: parseGender(data.gender),
    height:
      parseHeight(data.height) ??
      (extended ? parseHeight(extended.height) : null),
  };
}

export function demographicsProfileUpdate(data: Record<string, unknown>): {
  gender?: string;
  height?: number;
} {
  const { gender, height } = demographicsFromPayload(data);
  const update: { gender?: string; height?: number } = {};
  if (gender) update.gender = gender;
  if (height != null) update.height = height;
  return update;
}
