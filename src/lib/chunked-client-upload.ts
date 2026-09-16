import {
  CHUNKED_UPLOAD_PART_BYTES,
  VERCEL_SAFE_UPLOAD_BYTES,
  type UploadKind,
  resolveUploadMime,
} from "@/lib/upload-policy";
import { parseUploadResponse } from "@/lib/upload-response";

export function needsChunkedUpload(fileSize: number): boolean {
  return fileSize > VERCEL_SAFE_UPLOAD_BYTES;
}

/** 0–100. Permite al panel mostrar avance real en subidas largas. */
export type UploadProgressHandler = (percent: number) => void;

async function uploadChunkedFile(
  file: File,
  options: {
    folder?: string;
    kind: UploadKind;
    onProgress?: UploadProgressHandler;
  },
): Promise<{ url: string; id?: string; mimeType?: string }> {
  const folder = options.folder ?? "resources";
  const kind = options.kind;

  const initRes = await fetch("/api/resources/upload/init", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      fileName: file.name,
      mimeType: resolveUploadMime(file),
      folder,
      kind,
      totalSize: file.size,
    }),
  });
  const initJson = (await initRes.json()) as {
    sessionId?: string;
    totalChunks?: number;
    error?: string;
  };
  if (!initRes.ok || !initJson.sessionId) {
    throw new Error(initJson.error ?? "No se pudo iniciar la subida del archivo.");
  }
  const sessionId = initJson.sessionId;
  const totalChunks =
    typeof initJson.totalChunks === "number"
      ? initJson.totalChunks
      : Math.ceil(file.size / CHUNKED_UPLOAD_PART_BYTES);

  try {
    for (let index = 0; index < totalChunks; index += 1) {
      const start = index * CHUNKED_UPLOAD_PART_BYTES;
      const end = Math.min(start + CHUNKED_UPLOAD_PART_BYTES, file.size);
      const part = file.slice(start, end);

      const fd = new FormData();
      fd.append("sessionId", sessionId);
      fd.append("chunkIndex", String(index));
      fd.append("chunk", part, `${file.name}.part${index}`);

      const chunkRes = await fetch("/api/resources/upload/chunk", {
        method: "POST",
        body: fd,
      });
      const chunkJson = await parseUploadResponse(chunkRes);
      if (!chunkRes.ok) {
        throw new Error(
          chunkJson.error ??
            `Error al subir fragmento ${index + 1}/${totalChunks}.`,
        );
      }

      // Reservar el último tramo para el ensamblado en el servidor.
      options.onProgress?.(
        Math.round(((index + 1) / totalChunks) * 95),
      );
    }

    options.onProgress?.(97);

    const completeRes = await fetch("/api/resources/upload/complete", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sessionId }),
    });
    const completeJson = await parseUploadResponse(completeRes);
    if (!completeRes.ok || !completeJson.url) {
      throw new Error(
        completeJson.error ?? "No se pudo finalizar la subida del archivo.",
      );
    }

    options.onProgress?.(100);

    return {
      url: completeJson.url,
      id: completeJson.id,
      mimeType: completeJson.mimeType,
    };
  } catch (err) {
    await fetch("/api/resources/upload/cancel", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sessionId }),
    }).catch(() => {});
    throw err;
  }
}

export async function uploadFileWithChunks(
  file: File,
  options: {
    folder?: string;
    kind?: UploadKind;
    endpoint?: "/api/resources/upload" | "/api/payments/upload-proof";
    onProgress?: UploadProgressHandler;
  } = {},
): Promise<{ url: string; id?: string; mimeType?: string }> {
  const kind = options.kind ?? "any";
  const endpoint = options.endpoint ?? "/api/resources/upload";

  if (endpoint !== "/api/resources/upload" || !needsChunkedUpload(file.size)) {
    return uploadDirectFile(file, options);
  }

  return uploadChunkedFile(file, {
    folder: options.folder,
    kind,
    onProgress: options.onProgress,
  });
}

async function uploadDirectFile(
  file: File,
  options: {
    folder?: string;
    kind?: UploadKind;
    endpoint?: "/api/resources/upload" | "/api/payments/upload-proof";
    onProgress?: UploadProgressHandler;
  },
): Promise<{ url: string; id?: string; mimeType?: string }> {
  const kind = options.kind ?? "any";
  const fd = new FormData();
  fd.append("file", file);
  if (options.folder) fd.append("folder", options.folder);
  fd.append("kind", kind);

  const endpoint = options.endpoint ?? "/api/resources/upload";
  const res = await fetch(endpoint, { method: "POST", body: fd });
  const json = await parseUploadResponse(res);

  if (!res.ok || !json.url) {
    throw new Error(json.error ?? "Error al subir el archivo.");
  }

  options.onProgress?.(100);
  return { url: json.url, id: json.id, mimeType: json.mimeType };
}
