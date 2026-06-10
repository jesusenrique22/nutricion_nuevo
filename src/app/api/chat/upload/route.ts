import { NextRequest, NextResponse } from "next/server";
import { writeFile, mkdir } from "node:fs/promises";
import path from "node:path";
import { auth } from "@/lib/auth";
import { getMongoDb, Collections } from "@/server/db/mongo";
import { assertConversationAccess } from "@/server/services/chat-access";
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
    return NextResponse.json({ error: "Sin acceso a esta conversación" }, { status: 403 });
  }

  const db = await getMongoDb();

  const ext = path.extname(file.name) || mimeToExt(mimeType);
  const safeName = `${Date.now()}-${Math.random().toString(36).slice(2)}${ext}`;
  const relDir = path.join("uploads", "chat", conversationId);
  const absDir = path.join(process.cwd(), "public", relDir);

  await mkdir(absDir, { recursive: true });

  const buffer = Buffer.from(await file.arrayBuffer());
  await writeFile(path.join(absDir, safeName), buffer);

  const publicUrl = `/${relDir.replace(/\\/g, "/")}/${safeName}`;

  const fileDoc: FileDoc = {
    ownerId: session.user.id,
    context: "CHAT",
    relatedPatientId: conv.patientId,
    provider: "s3",
    publicId: safeName,
    url: publicUrl,
    secureUrl: publicUrl,
    mimeType,
    fileName: file.name,
    sizeBytes: file.size,
    uploadedAt: new Date(),
  };

  const res = await db.collection<FileDoc>(Collections.files).insertOne(fileDoc);

  return NextResponse.json({
    fileId: res.insertedId.toString(),
    url: publicUrl,
    mimeType,
    fileName: file.name,
    sizeBytes: file.size,
    messageType: inferMessageType(mimeType),
  });
}

function mimeToExt(mime: string): string {
  const map: Record<string, string> = {
    "image/jpeg": ".jpg",
    "image/png": ".png",
    "image/webp": ".webp",
    "image/gif": ".gif",
    "image/heic": ".heic",
    "image/heif": ".heif",
    "application/pdf": ".pdf",
    "video/mp4": ".mp4",
    "video/quicktime": ".mov",
  };
  return map[mime] ?? "";
}
