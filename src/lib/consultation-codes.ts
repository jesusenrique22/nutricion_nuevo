/** Código de tipo de consulta / paquete (dinámico en BD). */
export type ConsultationCode = string;

export const LEGACY_CONSULTATION_CODES = [
  "NUT_01",
  "ENT_02",
  "ANT_03",
] as const;

export type LegacyConsultationCode = (typeof LEGACY_CONSULTATION_CODES)[number];

export function isLegacyConsultationCode(
  code: string,
): code is LegacyConsultationCode {
  return (LEGACY_CONSULTATION_CODES as readonly string[]).includes(code);
}
