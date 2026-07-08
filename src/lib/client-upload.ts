import {
  type UploadKind,
  uploadLimitLabel,
  validateUploadFile,
} from "@/lib/upload-policy";
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
  const validation = validateUploadFile(file, kind);
  if (!validation.ok) {
    throw new Error(validation.message);
  }

  const fd = new FormData();
  fd.append("file", file);
  if (options.folder) fd.append("folder", options.folder);

  const endpoint = options.endpoint ?? "/api/resources/upload";
  const res = await fetch(endpoint, { method: "POST", body: fd });
  const json = await parseUploadResponse(res);

  if (!res.ok || !json.url) {
    throw new Error(json.error ?? "Error al subir el archivo.");
  }

  return { url: json.url, id: json.id };
}

export function uploadHint(kind: UploadKind): string {
  return `Cualquier tamaño razonable — máx. ${uploadLimitLabel(kind)}. Sin requisito de dimensiones.`;
}
