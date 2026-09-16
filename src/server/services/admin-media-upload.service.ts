import { revalidatePath } from "next/cache";
import { isPublicMediaFolder } from "@/lib/media-access-policy";
import { revalidatePublicSiteMediaCache } from "@/lib/public-site-media";
import {
  type UploadKind,
  validateUploadFile,
} from "@/lib/upload-policy";
import { statStoredFileUrl } from "@/lib/stored-file";
import { prepareUpload, storePublicBuffer } from "@/server/services/file-storage";
import { registerMediaAsset } from "@/server/services/media-library.service";

export type AdminMediaUploadResult =
  | {
      ok: true;
      url: string;
      mimeType: string;
      fileName: string;
      id?: string;
    }
  | { ok: false; message: string };

function looksLikePdf(buffer: Buffer): boolean {
  return buffer.subarray(0, 5).toString("ascii") === "%PDF-";
}

export async function processAdminMediaUpload(
  file: File,
  options: {
    folder: string;
    kind: UploadKind;
    ownerId: string;
  },
): Promise<AdminMediaUploadResult> {
  const safeFolder =
    /^[\w-]+$/.test(options.folder) ? options.folder : "resources";

  const kind =
    options.kind === "pdf" ||
    options.kind === "image" ||
    options.kind === "video"
      ? options.kind
      : "any";

  const validation = validateUploadFile(file, kind);
  if (!validation.ok) {
    return { ok: false, message: validation.message };
  }

  // Leer una sola vez: los mismos bytes se inspeccionan y se guardan.
  const prepared = await prepareUpload(file, safeFolder);

  if (prepared.buffer.length === 0) {
    return { ok: false, message: "El archivo llegó vacío. Probá de nuevo." };
  }

  // Revisar la cabecera ANTES de guardar: si no es un PDF, no tiene sentido
  // ocupar GridFS ni hacer esperar a quien sube.
  if (kind === "pdf" && !looksLikePdf(prepared.buffer)) {
    return {
      ok: false,
      message: "El archivo no es un PDF válido. Probá exportarlo de nuevo.",
    };
  }

  const stored = await storePublicBuffer(prepared.buffer, safeFolder, {
    fileName: prepared.fileName,
    mimeType: prepared.mimeType,
    ownerId: options.ownerId,
  });

  // Verificación por metadatos, no releyendo el binario: confirma que quedó
  // guardado y completo sin gastar el tiempo de la función en una descarga.
  const info = await statStoredFileUrl(stored.url);
  if (!info) {
    return {
      ok: false,
      message:
        "No se pudo confirmar el archivo en el almacenamiento. Intentá de nuevo en unos segundos.",
    };
  }
  if (info.size !== prepared.buffer.length) {
    return {
      ok: false,
      message:
        "El archivo se guardó incompleto. Intentá subirlo de nuevo con mejor conexión.",
    };
  }

  const asset = await registerMediaAsset(stored, {
    folder: safeFolder,
    fileName: file.name,
    ownerId: options.ownerId,
  });

  if (isPublicMediaFolder(safeFolder)) {
    revalidatePublicSiteMediaCache();
    revalidatePath("/");
    revalidatePath("/login");
    revalidatePath("/register");
    revalidatePath("/dashboard/admin/personalizar");
  }

  return {
    ok: true,
    url: stored.url,
    mimeType: stored.mimeType,
    fileName: file.name,
    id: asset.id,
  };
}
