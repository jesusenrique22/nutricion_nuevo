import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { storePublicFile } from "@/server/services/file-storage";
import { registerMediaAsset } from "@/server/services/media-library.service";

const MAX_BYTES = 25 * 1024 * 1024;

const ALLOWED = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "application/pdf",
  "video/mp4",
  "video/webm",
]);

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (session?.user?.role !== "ADMIN") {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const formData = await req.formData();
    const file = formData.get("file");
    const folder = formData.get("folder");

    if (!(file instanceof File)) {
      return NextResponse.json({ error: "Archivo requerido" }, { status: 400 });
    }

    const safeFolder =
      typeof folder === "string" && /^[\w-]+$/.test(folder)
        ? folder
        : "resources";

    if (file.size > MAX_BYTES) {
      return NextResponse.json(
        { error: "Archivo demasiado grande (máx. 25 MB)" },
        { status: 400 },
      );
    }

    if (!ALLOWED.has(file.type)) {
      return NextResponse.json(
        { error: "Tipo de archivo no permitido" },
        { status: 400 },
      );
    }

    const stored = await storePublicFile(file, safeFolder, {
      ownerId: session.user.id,
    });

    let assetId: string | undefined;
    if (file.type.startsWith("image/")) {
      try {
        const asset = await registerMediaAsset(stored, {
          folder: safeFolder,
          fileName: file.name,
          ownerId: session.user.id,
        });
        assetId = asset.id;
      } catch (registerErr) {
        console.warn("[resources/upload] No se pudo registrar en biblioteca:", registerErr);
      }
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
