import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import {
  CHUNKED_UPLOAD_PART_BYTES,
  type UploadKind,
  resolveUploadMime,
  validateUploadMetadata,
} from "@/lib/upload-policy";
import { initChunkedUpload } from "@/server/services/chunked-upload.service";
import { limitUploadByKey } from "@/lib/ratelimit";

export const maxDuration = 30;

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (session?.user?.role !== "ADMIN") {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const rl = await limitUploadByKey(`admin-chunk-init:${session.user.id}`);
    if (!rl.success) {
      return NextResponse.json(
        { error: "Demasiadas subidas. Esperá unos segundos." },
        { status: 429 },
      );
    }

    const body = (await req.json()) as {
      fileName?: string;
      mimeType?: string;
      folder?: string;
      kind?: UploadKind;
      totalSize?: number;
    };

    const fileName = body.fileName?.trim();
    const totalSize = body.totalSize;
    const folder =
      typeof body.folder === "string" && /^[\w-]+$/.test(body.folder)
        ? body.folder
        : "resources";
    const kind =
      body.kind === "pdf" ||
      body.kind === "image" ||
      body.kind === "video" ||
      body.kind === "proof"
        ? body.kind
        : "any";

    if (!fileName || typeof totalSize !== "number" || totalSize <= 0) {
      return NextResponse.json({ error: "Datos inválidos." }, { status: 400 });
    }

    const mimeType =
      body.mimeType?.trim() ||
      resolveUploadMime(new File([], fileName));

    const validation = validateUploadMetadata(
      fileName,
      mimeType,
      totalSize,
      kind,
    );
    if (!validation.ok) {
      return NextResponse.json({ error: validation.message }, { status: 400 });
    }

    const totalChunks = Math.ceil(totalSize / CHUNKED_UPLOAD_PART_BYTES);
    const uploadSession = await initChunkedUpload({
      ownerId: session.user.id,
      fileName,
      mimeType: validation.mime,
      folder,
      kind,
      totalSize,
      totalChunks,
    });

    return NextResponse.json(uploadSession);
  } catch (err) {
    console.error("[resources/upload/init]", err);
    const message =
      err instanceof Error
        ? err.message
        : "No pudimos iniciar la subida. Intentá de nuevo.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
