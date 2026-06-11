import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { storePublicFile } from "@/server/services/file-storage";

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
    return NextResponse.json({ url: stored.url, mimeType: stored.mimeType });
  } catch (err) {
    console.error("[resources/upload]", err);
    const message =
      err instanceof Error ? err.message : "Error al subir el archivo.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
