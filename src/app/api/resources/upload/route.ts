import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import type { UploadKind } from "@/lib/upload-policy";
import { processAdminMediaUpload } from "@/server/services/admin-media-upload.service";
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
      kindRaw === "pdf" ||
      kindRaw === "image" ||
      kindRaw === "video" ||
      kindRaw === "proof" ||
      kindRaw === "any"
        ? (kindRaw as UploadKind)
        : "any";

    const result = await processAdminMediaUpload(file, {
      folder: safeFolder,
      kind,
      ownerId: session.user.id,
    });

    if (!result.ok) {
      return NextResponse.json({ error: result.message }, { status: 400 });
    }

    return NextResponse.json({
      url: result.url,
      mimeType: result.mimeType,
      fileName: result.fileName,
      id: result.id,
    });
  } catch (err) {
    console.error("[resources/upload]", err);
    const message =
      err instanceof Error
        ? err.message
        : "No pudimos subir el archivo. Intentá de nuevo.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
