import { z } from "zod";

const PASSWORD_MIN_LENGTH = 8;
const PASSWORD_MAX_LENGTH = 128;
const ALLOWED_CHARS = /^[\x20-\x7E]+$/;

export const PASSWORD_REQUIREMENTS_HINT =
  "Mínimo 8 caracteres, con mayúscula, minúscula, número y símbolo. Sin acentos.";

export interface PasswordCheck {
  id: string;
  label: string;
  met: boolean;
}

/** Estado de cada requisito para mostrar un checklist en vivo durante el registro. */
export function getPasswordChecks(password: string): PasswordCheck[] {
  const withoutSpaces = password.replace(/\s/g, "");
  const noAccents = password.length === 0 || ALLOWED_CHARS.test(password);

  return [
    {
      id: "length",
      label: "Al menos 8 caracteres",
      met: password.length >= PASSWORD_MIN_LENGTH,
    },
    {
      id: "uppercase",
      label: "Una letra mayúscula (A-Z)",
      met: /[A-Z]/.test(withoutSpaces),
    },
    {
      id: "lowercase",
      label: "Una letra minúscula (a-z)",
      met: /[a-z]/.test(withoutSpaces),
    },
    {
      id: "number",
      label: "Un número (0-9)",
      met: /[0-9]/.test(withoutSpaces),
    },
    {
      id: "symbol",
      label: "Un símbolo (!, @, #, $…)",
      met: /[^A-Za-z0-9]/.test(withoutSpaces),
    },
    {
      id: "noAccents",
      label: "Sin acentos ni caracteres especiales",
      met: noAccents,
    },
  ];
}

/** ¿La contraseña cumple todos los requisitos? */
export function isPasswordValid(password: string): boolean {
  return getPasswordChecks(password).every((c) => c.met);
}

export function validatePasswordRequirements(password: string): string | null {
  if (password.length < PASSWORD_MIN_LENGTH) {
    return "Mínimo 8 caracteres";
  }
  if (password.length > PASSWORD_MAX_LENGTH) {
    return "Contraseña demasiado larga";
  }
  if (!ALLOWED_CHARS.test(password)) {
    return "La contraseña no puede incluir acentos";
  }

  const withoutSpaces = password.replace(/\s/g, "");

  if (!/[A-Z]/.test(withoutSpaces)) {
    return "Debe incluir al menos una mayúscula";
  }
  if (!/[a-z]/.test(withoutSpaces)) {
    return "Debe incluir al menos una minúscula";
  }
  if (!/[0-9]/.test(withoutSpaces)) {
    return "Debe incluir al menos un número";
  }
  if (!/[^A-Za-z0-9]/.test(withoutSpaces)) {
    return "Debe incluir al menos un símbolo";
  }

  return null;
}

export const passwordSchema = z.string().superRefine((value, ctx) => {
  const message = validatePasswordRequirements(value);
  if (message) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message });
  }
});
