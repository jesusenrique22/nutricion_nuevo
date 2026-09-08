import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { deleteMediaAsset } from "@/server/services/media-library.service";

type RouteContext = { params: Promise<{ id: string }> };

export async function DELETE(_req: Request, context: RouteContext) {
  const session = await auth();
  if (session?.user?.role !== "ADMIN") {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  try {
    const { id } = await context.params;
    const deleted = await deleteMediaAsset(id);
    if (!deleted) {
      return NextResponse.json({ error: "Imagen no encontrada" }, { status: 404 });
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[media/library/delete]", err);
    return NextResponse.json(
      { error: "No pudimos eliminar la imagen. Intentá de nuevo." },
      { status: 500 },
    );
  }
}
