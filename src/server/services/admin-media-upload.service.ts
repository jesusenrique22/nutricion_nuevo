import { revalidatePath } from "next/cache";
import { isPublicMediaFolder } from "@/lib/media-access-policy";
import { revalidatePublicSiteMediaCache } from "@/lib/public-site-media";
import {
  type UploadKind,
  validateUploadFile,
} from "@/lib/upload-policy";
import { storePublicFile } from "@/server/services/file-storage";
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

  const stored = await storePublicFile(file, safeFolder, {
    ownerId: options.ownerId,
  });

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
