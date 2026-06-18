/** Normaliza email para comparación y almacenamiento consistente. */
export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}
