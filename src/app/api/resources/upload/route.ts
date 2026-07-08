import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { isPublicMediaFolder } from "@/lib/media-access-policy";
import { revalidatePublicSiteMediaCache } from "@/lib/public-site-media";
import { validateUploadFile } from "@/lib/upload-policy";
import { storePublicFile } from "@/server/services/file-storage";
import { registerMediaAsset } from "@/server/services/media-library.service";
import { limitUploadByKey } from "@/lib/ratelimit";

export const maxDuration = 120;

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (session?.user?.role !== "ADMIN") {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const rl = await limitUploadByKey(`admin:${session.user.id}`);
    if (!rl.success) {
      return NextResponse.json(
        { error: "Demasiadas subidas. Esperá unos segundos." },
        { status: 429 },
      );
    }

    const formData = await req.formData();
    const file = formData.get("file");
    const folder = formData.get("folder");
    const kindRaw = formData.get("kind");

    if (!(file instanceof File)) {
      return NextResponse.json({ error: "Archivo requerido" }, { status: 400 });
    }

    const safeFolder =
      typeof folder === "string" && /^[\w-]+$/.test(folder)
        ? folder
        : "resources";

    const kind =
      kindRaw === "pdf" || kindRaw === "image" || kindRaw === "video"
        ? kindRaw
        : "any";

    const validation = validateUploadFile(file, kind);
    if (!validation.ok) {
      return NextResponse.json({ error: validation.message }, { status: 400 });
    }

    const stored = await storePublicFile(file, safeFolder, {
      ownerId: session.user.id,
    });

    let assetId: string | undefined;
    if (validation.mime.startsWith("image/")) {
      try {
        const asset = await registerMediaAsset(stored, {
          folder: safeFolder,
          fileName: file.name,
          ownerId: session.user.id,
        });
        assetId = asset.id;
      } catch (registerErr) {
        console.warn("[resources/upload] biblioteca:", registerErr);
      }
    }

    if (isPublicMediaFolder(safeFolder)) {
      revalidatePublicSiteMediaCache();
    }

    return NextResponse.json({
      url: stored.url,
      mimeType: stored.mimeType,
      id: assetId,
    });
  } catch (err) {
    console.error("[resources/upload]", err);
    const message =
      err instanceof Error ? err.message : "Error al subir el archivo.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
