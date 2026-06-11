import { NextRequest, NextResponse } from "next/server";
import path from "node:path";
import { auth } from "@/lib/auth";
import { getMongoDb, Collections } from "@/server/db/mongo";
import { assertConversationAccess } from "@/server/services/chat-access";
import { storePublicFile } from "@/server/services/file-storage";
import type { FileDoc, MessageType } from "@/types/chat";

const MAX_BYTES = 10 * 1024 * 1024; // 10 MB

const ALLOWED_TYPES: Record<string, MessageType> = {
  "image/jpeg": "IMAGE",
  "image/jpg": "IMAGE",
  "image/png": "IMAGE",
  "image/webp": "IMAGE",
  "image/gif": "IMAGE",
  "image/heic": "IMAGE",
  "image/heif": "IMAGE",
  "image/avif": "IMAGE",
  "image/bmp": "IMAGE",
  "application/pdf": "PDF",
  "video/mp4": "VIDEO",
  "video/quicktime": "VIDEO",
  "video/webm": "VIDEO",
};

const EXT_TO_MIME: Record<string, string> = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
  ".gif": "image/gif",
  ".heic": "image/heic",
  ".heif": "image/heif",
  ".avif": "image/avif",
  ".bmp": "image/bmp",
  ".pdf": "application/pdf",
  ".mp4": "video/mp4",
  ".mov": "video/quicktime",
  ".webm": "video/webm",
};

function resolveMimeType(file: File): string {
  const normalized = file.type?.toLowerCase().trim();
  if (normalized && normalized !== "application/octet-stream") {
    return normalized;
  }
  const ext = path.extname(file.name).toLowerCase();
  return EXT_TO_MIME[ext] ?? normalized ?? "";
}

function inferMessageType(mime: string): MessageType {
  return ALLOWED_TYPES[mime] ?? "FILE";
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const formData = await req.formData();
    const file = formData.get("file");
    const conversationId = formData.get("conversationId");

    if (!(file instanceof File) || typeof conversationId !== "string") {
      return NextResponse.json({ error: "Datos inválidos" }, { status: 400 });
    }

    if (file.size > MAX_BYTES) {
      return NextResponse.json(
        { error: "El archivo es demasiado grande. Máximo 10 MB." },
        { status: 400 },
      );
    }

    const mimeType = resolveMimeType(file);
    if (!ALLOWED_TYPES[mimeType]) {
      return NextResponse.json(
        {
          error:
            "Tipo de archivo no permitido. Podés enviar fotos (JPG, PNG, WEBP, HEIC), PDF o videos MP4.",
        },
        { status: 400 },
      );
    }

    const conv = await assertConversationAccess(
      conversationId,
      session.user.id,
      session.user.role,
    );
    if (!conv) {
      return NextResponse.json(
        { error: "Sin acceso a esta conversación" },
        { status: 403 },
      );
    }

    const stored = await storePublicFile(file, `chat/${conversationId}`, {
      ownerId: session.user.id,
    });

    const db = await getMongoDb();
    const fileDoc: FileDoc = {
      ownerId: session.user.id,
      context: "CHAT",
      relatedPatientId: conv.patientId,
      provider: stored.provider === "mongodb" ? "mongodb" : "local",
      publicId: stored.fileId ?? stored.url,
      url: stored.url,
      secureUrl: stored.url,
      mimeType,
      fileName: file.name,
      sizeBytes: file.size,
      uploadedAt: new Date(),
    };

    const res = await db
      .collection<FileDoc>(Collections.files)
      .insertOne(fileDoc);

    return NextResponse.json({
      fileId: res.insertedId.toString(),
      url: stored.url,
      mimeType,
      fileName: file.name,
      sizeBytes: file.size,
      messageType: inferMessageType(mimeType),
    });
  } catch (err) {
    console.error("[chat/upload]", err);
    const message =
      err instanceof Error ? err.message : "Error al subir el archivo.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
