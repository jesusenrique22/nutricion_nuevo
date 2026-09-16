import {
  normalizeStoredUrl,
  parseMediaIdFromUrl,
} from "@/lib/stored-file-url";

/** Etiqueta inmediata sin consultar la base (p. ej. mientras carga el nombre real). */
export function quickStoredFileLabel(
  url: string,
  fallback = "documento.pdf",
): string {
  const normalized = normalizeStoredUrl(url).trim();
  if (!normalized) return fallback;

  if (normalized.startsWith("/api/media/")) {
    return fallback;
  }

  try {
    if (/^https?:\/\//i.test(normalized)) {
      const name = decodeURIComponent(
        new URL(normalized).pathname.split("/").pop() ?? "",
      );
      return name || fallback;
    }
  } catch {
    // seguir
  }

  const segment = decodeURIComponent(normalized.split("/").pop() ?? "");
  if (segment && !segment.includes("?")) return segment;
  return fallback;
}

export function isInternalStoredMediaUrl(url: string): boolean {
  const normalized = normalizeStoredUrl(url);
  return (
    normalized.startsWith("/api/media/") ||
    normalized.startsWith("/uploads/") ||
    normalized.startsWith("stored://")
  );
}

export function mediaIdFromStoredUrl(url: string): string | null {
  return parseMediaIdFromUrl(url);
}

/**
 * ¿Es un origen que el servidor puede leer y servirle al paciente?
 *
 * Arrastrar un archivo del escritorio a un campo de texto deja una ruta
 * `file:///Users/...` que solo existe en esa computadora: se guardaba sin
 * chistar y el recurso quedaba imposible de abrir para todos los demás.
 */
export function isServableContentUrl(url: string): boolean {
  const raw = url.trim();
  if (!raw) return false;
  // Contra el valor crudo: normalizeStoredUrl le saca el host a cualquier URL
  // absoluta, así que un enlace externo legítimo quedaría irreconocible.
  if (/^https:\/\/\S+$/i.test(raw)) return true;
  return isInternalStoredMediaUrl(normalizeStoredUrl(raw));
}

export const CONTENT_URL_VALIDATION_MESSAGE =
  "El archivo principal tiene que estar subido a la plataforma (usá «Subir PDF») o ser un enlace https:// público. Una ruta de tu computadora (file://…) solo funciona en tu equipo.";
