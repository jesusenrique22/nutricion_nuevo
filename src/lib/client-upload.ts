import {
  type UploadKind,
  uploadLimitLabel,
  validateUploadFile,
} from "@/lib/upload-policy";
import { prepareImageForUpload } from "@/lib/client-image-upload";
import { parseUploadResponse } from "@/lib/upload-response";

export type UploadEndpoint = "/api/resources/upload" | "/api/payments/upload-proof";

export async function uploadFile(
  file: File,
  options: {
    folder?: string;
    kind?: UploadKind;
    endpoint?: UploadEndpoint;
  } = {},
): Promise<{ url: string; id?: string; mimeType?: string }> {
  const kind = options.kind ?? "any";
  const isImageLike =
    kind === "image" ||
    kind === "proof" ||
    (kind === "any" && file.type.startsWith("image/"));
  // Comprimir en el navegador (incluye comprobantes de pago) para no exceder
  // el límite de cuerpo de Vercel ni guardar capturas de teléfono enormes.
  // Si no se puede comprimir (p. ej. HEIC), se sube el original: el servidor lo acepta.
  let uploadFile = file;
  if (isImageLike && file.type.startsWith("image/")) {
    try {
      uploadFile = await prepareImageForUpload(file);
    } catch (err) {
      if (kind === "image") throw err;
      uploadFile = file;
    }
  }
  const validation = validateUploadFile(uploadFile, kind);
  if (!validation.ok) {
    throw new Error(validation.message);
  }

  const fd = new FormData();
  fd.append("file", uploadFile);
  if (options.folder) fd.append("folder", options.folder);
  fd.append("kind", kind);

  const endpoint = options.endpoint ?? "/api/resources/upload";
  const res = await fetch(endpoint, { method: "POST", body: fd });
  const json = await parseUploadResponse(res);

  if (!res.ok || !json.url) {
    throw new Error(json.error ?? "Error al subir el archivo.");
  }

  return { url: json.url, id: json.id };
}

export function uploadHint(kind: UploadKind): string {
  if (kind === "image") {
    return "La imagen se adapta automáticamente al contenedor y se optimiza antes de subir.";
  }
  return `Cualquier tamaño razonable — máx. ${uploadLimitLabel(kind)}.`;
}
