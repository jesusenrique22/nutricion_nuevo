import {
  type UploadKind,
  isImageUploadCandidate,
  isUnsafeImageFormat,
  uploadLimitLabel,
  validateUploadFile,
} from "@/lib/upload-policy";
import { prepareImageForUpload } from "@/lib/client-image-upload";
import { uploadFileWithChunks, needsChunkedUpload } from "@/lib/chunked-client-upload";
import { parseUploadResponse } from "@/lib/upload-response";
import { uploadAdminMediaFile } from "@/server/actions/media-upload.actions";

export type UploadEndpoint = "/api/resources/upload" | "/api/payments/upload-proof";

/**
 * Sube un archivo. Toda imagen (recursos, paquetes, sobre mí, comprobantes, etc.)
 * se normaliza a un formato web seguro (JPG) antes de salir del navegador.
 */
export async function uploadFile(
  file: File,
  options: {
    folder?: string;
    kind?: UploadKind;
    endpoint?: UploadEndpoint;
  } = {},
): Promise<{ url: string; id?: string; mimeType?: string; fileName?: string }> {
  const kind = options.kind ?? "any";
  const shouldNormalizeImage =
    kind === "image" ||
    kind === "proof" ||
    (kind === "any" && isImageUploadCandidate(file));

  let uploadFile = file;
  if (shouldNormalizeImage) {
    try {
      uploadFile = await prepareImageForUpload(file);
    } catch (err) {
      // Nunca subir HEIC/AVIF crudos: rompen en Chrome/Firefox.
      if (isUnsafeImageFormat(file)) throw err;
      if (kind === "image" || kind === "proof") throw err;
      uploadFile = file;
    }
  }

  if (isImageUploadCandidate(uploadFile) && isUnsafeImageFormat(uploadFile)) {
    throw new Error(
      "No se pudo convertir la imagen a un formato compatible. Exportala como JPG o PNG e intentá de nuevo.",
    );
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

  if (endpoint === "/api/resources/upload") {
    // Arriba del límite de body de Vercel, ir directo a fragmentos: intentar
    // primero el Server Action significaría subir el archivo entero dos veces.
    if (needsChunkedUpload(uploadFile.size)) {
      return uploadFileWithChunks(uploadFile, {
        folder: options.folder,
        kind,
        endpoint,
      });
    }

    const result = await uploadAdminMediaFile(fd);
    if (result.ok) {
      return {
        url: result.url,
        id: result.id,
        mimeType: result.mimeType,
        fileName: result.fileName,
      };
    }

    return uploadFileWithChunks(uploadFile, {
      folder: options.folder,
      kind,
      endpoint,
    });
  }

  const res = await fetch(endpoint, { method: "POST", body: fd });
  const json = await parseUploadResponse(res);

  if (!res.ok || !json.url) {
    throw new Error(json.error ?? "Error al subir el archivo.");
  }

  return { url: json.url, id: json.id, mimeType: json.mimeType };
}

export function uploadHint(kind: UploadKind): string {
  if (kind === "image" || kind === "proof") {
    return "Se convierte sola a JPG si hace falta (p. ej. fotos HEIC de iPhone) para que se vea en todos los navegadores.";
  }
  return `Cualquier tamaño razonable — máx. ${uploadLimitLabel(kind)}.`;
}
