import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { cancelChunkedUpload } from "@/server/services/chunked-upload.service";

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (session?.user?.role !== "ADMIN") {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const body = (await req.json()) as { sessionId?: string };
    if (!body.sessionId?.trim()) {
      return NextResponse.json({ error: "Sesión inválida." }, { status: 400 });
    }

    await cancelChunkedUpload({
      sessionId: body.sessionId.trim(),
      ownerId: session.user.id,
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[resources/upload/cancel]", err);
    return NextResponse.json({ error: "No se pudo cancelar." }, { status: 500 });
  }
}
