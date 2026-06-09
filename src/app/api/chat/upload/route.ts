import { NextRequest, NextResponse } from "next/server";
import { writeFile, mkdir } from "node:fs/promises";
import path from "node:path";
import { ObjectId } from "mongodb";
import { auth } from "@/lib/auth";
import { getMongoDb, Collections } from "@/server/db/mongo";
import { assertConversationAccess } from "@/server/services/chat-access";
import type { FileDoc, MessageType } from "@/types/chat";

const MAX_BYTES = 10 * 1024 * 1024; // 10 MB

const ALLOWED_TYPES: Record<string, MessageType> = {
  "image/jpeg": "IMAGE",
  "image/png": "IMAGE",
  "image/webp": "IMAGE",
  "image/gif": "IMAGE",
  "application/pdf": "PDF",
  "video/mp4": "VIDEO",
};

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
      { error: "Archivo demasiado grande (máx. 10 MB)" },
      { status: 400 },
    );
  }

  if (!ALLOWED_TYPES[file.type]) {
    return NextResponse.json(
      { error: "Tipo de archivo no permitido" },
      { status: 400 },
    );
  }

  const conv = await assertConversationAccess(
    conversationId,
    session.user.id,
    session.user.role,
  );

  if (!conv) {
    return NextResponse.json({ error: "Sin acceso" }, { status: 403 });
  }

  const db = await getMongoDb();

  const ext = path.extname(file.name) || "";
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
    mimeType: file.type,
    fileName: file.name,
    sizeBytes: file.size,
    uploadedAt: new Date(),
  };

  const res = await db.collection<FileDoc>(Collections.files).insertOne(fileDoc);

  return NextResponse.json({
    fileId: res.insertedId.toString(),
    url: publicUrl,
    mimeType: file.type,
    fileName: file.name,
    sizeBytes: file.size,
    messageType: inferMessageType(file.type),
  });
}
