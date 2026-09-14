/**
 * Países y prefijos telefónicos para el selector del registro.
 * Sin dependencias de servidor: se importa también desde componentes cliente.
 */
export type PhoneCountry = {
  /** ISO 3166-1 alpha-2. */
  code: string;
  name: string;
  /** Prefijo internacional sin el «+». */
  dial: string;
  flag: string;
};

/** Ordenados: primero los de mayor uso en la clínica, luego alfabético. */
export const PHONE_COUNTRIES: PhoneCountry[] = [
  { code: "AR", name: "Argentina", dial: "54", flag: "🇦🇷" },
  { code: "VE", name: "Venezuela", dial: "58", flag: "🇻🇪" },
  { code: "BO", name: "Bolivia", dial: "591", flag: "🇧🇴" },
  { code: "BR", name: "Brasil", dial: "55", flag: "🇧🇷" },
  { code: "CL", name: "Chile", dial: "56", flag: "🇨🇱" },
  { code: "CO", name: "Colombia", dial: "57", flag: "🇨🇴" },
  { code: "CR", name: "Costa Rica", dial: "506", flag: "🇨🇷" },
  { code: "CU", name: "Cuba", dial: "53", flag: "🇨🇺" },
  { code: "EC", name: "Ecuador", dial: "593", flag: "🇪🇨" },
  { code: "SV", name: "El Salvador", dial: "503", flag: "🇸🇻" },
  { code: "ES", name: "España", dial: "34", flag: "🇪🇸" },
  { code: "US", name: "Estados Unidos", dial: "1", flag: "🇺🇸" },
  { code: "GT", name: "Guatemala", dial: "502", flag: "🇬🇹" },
  { code: "HN", name: "Honduras", dial: "504", flag: "🇭🇳" },
  { code: "MX", name: "México", dial: "52", flag: "🇲🇽" },
  { code: "NI", name: "Nicaragua", dial: "505", flag: "🇳🇮" },
  { code: "PA", name: "Panamá", dial: "507", flag: "🇵🇦" },
  { code: "PY", name: "Paraguay", dial: "595", flag: "🇵🇾" },
  { code: "PE", name: "Perú", dial: "51", flag: "🇵🇪" },
  { code: "PR", name: "Puerto Rico", dial: "1787", flag: "🇵🇷" },
  { code: "DO", name: "República Dominicana", dial: "1809", flag: "🇩🇴" },
  { code: "UY", name: "Uruguay", dial: "598", flag: "🇺🇾" },
  { code: "DE", name: "Alemania", dial: "49", flag: "🇩🇪" },
  { code: "AU", name: "Australia", dial: "61", flag: "🇦🇺" },
  { code: "BE", name: "Bélgica", dial: "32", flag: "🇧🇪" },
  { code: "CA", name: "Canadá", dial: "1", flag: "🇨🇦" },
  { code: "CN", name: "China", dial: "86", flag: "🇨🇳" },
  { code: "FR", name: "Francia", dial: "33", flag: "🇫🇷" },
  { code: "IL", name: "Israel", dial: "972", flag: "🇮🇱" },
  { code: "IT", name: "Italia", dial: "39", flag: "🇮🇹" },
  { code: "JP", name: "Japón", dial: "81", flag: "🇯🇵" },
  { code: "MA", name: "Marruecos", dial: "212", flag: "🇲🇦" },
  { code: "NL", name: "Países Bajos", dial: "31", flag: "🇳🇱" },
  { code: "PT", name: "Portugal", dial: "351", flag: "🇵🇹" },
  { code: "GB", name: "Reino Unido", dial: "44", flag: "🇬🇧" },
  { code: "CH", name: "Suiza", dial: "41", flag: "🇨🇭" },
];

export const DEFAULT_PHONE_COUNTRY = "AR";

export function findPhoneCountry(code: string): PhoneCountry | undefined {
  return PHONE_COUNTRIES.find((c) => c.code === code);
}

/** Deja solo dígitos. */
export function digitsOnly(value: string): string {
  return value.replace(/\D+/g, "");
}

/**
 * Arma el número en formato E.164 (`+<prefijo><número nacional>`).
 * Devuelve `null` si el número nacional no tiene largo razonable.
 */
export function buildE164(
  countryCode: string,
  nationalNumber: string,
): string | null {
  const country = findPhoneCountry(countryCode);
  if (!country) return null;

  let national = digitsOnly(nationalNumber);
  // Tolerar que el paciente escriba el prefijo o el 0 inicial de su país.
  if (national.startsWith(country.dial) && national.length > country.dial.length) {
    national = national.slice(country.dial.length);
  }
  national = national.replace(/^0+/, "");

  if (national.length < 6 || national.length > 14) return null;

  const full = `${country.dial}${national}`;
  if (full.length > 15) return null;

  return `+${full}`;
}

/** Formato aceptado al guardar: `+` seguido de 8 a 15 dígitos. */
export const E164_REGEX = /^\+[1-9]\d{7,14}$/;

export function isValidE164(value: string): boolean {
  return E164_REGEX.test(value);
}
