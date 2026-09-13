import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { storeChunkedUploadPart } from "@/server/services/chunked-upload.service";
import { limitUploadByKey } from "@/lib/ratelimit";

export const maxDuration = 60;

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (session?.user?.role !== "ADMIN") {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const rl = await limitUploadByKey(`admin-chunk:${session.user.id}`);
    if (!rl.success) {
      return NextResponse.json(
        { error: "Demasiadas subidas. Esperá unos segundos." },
        { status: 429 },
      );
    }

    const formData = await req.formData();
    const sessionId = formData.get("sessionId");
    const chunkIndexRaw = formData.get("chunkIndex");
    const chunk = formData.get("chunk");

    if (
      typeof sessionId !== "string" ||
      typeof chunkIndexRaw !== "string" ||
      !(chunk instanceof Blob)
    ) {
      return NextResponse.json({ error: "Datos inválidos." }, { status: 400 });
    }

    const chunkIndex = Number(chunkIndexRaw);
    if (!Number.isInteger(chunkIndex) || chunkIndex < 0) {
      return NextResponse.json({ error: "Índice inválido." }, { status: 400 });
    }

    const buffer = Buffer.from(await chunk.arrayBuffer());
    if (buffer.length === 0) {
      return NextResponse.json({ error: "Fragmento vacío." }, { status: 400 });
    }

    const progress = await storeChunkedUploadPart({
      sessionId,
      ownerId: session.user.id,
      chunkIndex,
      data: buffer,
    });

    return NextResponse.json(progress);
  } catch (err) {
    console.error("[resources/upload/chunk]", err);
    const message =
      err instanceof Error
        ? err.message
        : "No pudimos recibir el fragmento. Intentá de nuevo.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
