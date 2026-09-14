"use server";

import { auth } from "@/lib/auth";
import type { UploadKind } from "@/lib/upload-policy";
import { limitUploadByKey } from "@/lib/ratelimit";
import { processAdminMediaUpload } from "@/server/services/admin-media-upload.service";

export type AdminMediaUploadActionResult =
  | {
      ok: true;
      url: string;
      mimeType: string;
      fileName: string;
      id?: string;
    }
  | { ok: false; message: string };

/**
 * Subida de archivos chicos del panel admin en una sola request. Los archivos
 * que superan VERCEL_SAFE_UPLOAD_BYTES van por la ruta fragmentada.
 */
export async function uploadAdminMediaFile(
  formData: FormData,
): Promise<AdminMediaUploadActionResult> {
  try {
    const session = await auth();
    if (session?.user?.role !== "ADMIN") {
      return { ok: false, message: "No autorizado" };
    }

    const rl = await limitUploadByKey(`admin:${session.user.id}`);
    if (!rl.success) {
      return {
        ok: false,
        message: "Demasiadas subidas. Esperá unos segundos.",
      };
    }

    const file = formData.get("file");
    const folderRaw = formData.get("folder");
    const kindRaw = formData.get("kind");

    if (!(file instanceof File)) {
      return { ok: false, message: "Archivo requerido" };
    }

    const folder =
      typeof folderRaw === "string" && folderRaw.trim()
        ? folderRaw.trim()
        : "resources";

    const kind =
      kindRaw === "pdf" ||
      kindRaw === "image" ||
      kindRaw === "video" ||
      kindRaw === "proof" ||
      kindRaw === "any"
        ? (kindRaw as UploadKind)
        : "any";

    return processAdminMediaUpload(file, {
      folder,
      kind,
      ownerId: session.user.id,
    });
  } catch (err) {
    console.error("[uploadAdminMediaFile]", err);
    return {
      ok: false,
      message: "No pudimos subir el archivo. Intentá de nuevo.",
    };
  }
}
