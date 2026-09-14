import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { handleMediaGet } from "@/server/services/media-id-get";
import {
  deleteMediaAsset,
  listMediaAssets,
} from "@/server/services/media-library.service";


type RouteContext = { params: Promise<{ path: string[] }> };

export async function GET(req: NextRequest, context: RouteContext) {
  try {
    const path = (await context.params).path ?? [];
    if (path.length === 1 && path[0] === "library") {
      const session = await auth();
      if (session?.user?.role !== "ADMIN") {
        return NextResponse.json({ error: "No autorizado" }, { status: 401 });
      }

      const folder = req.nextUrl.searchParams.get("folder") ?? "site";
      if (!/^[\w-]+$/.test(folder)) {
        return NextResponse.json({ error: "Carpeta inválida" }, { status: 400 });
      }

      const items = await listMediaAssets(folder);
      return NextResponse.json({ items });
    }

    if (path.length === 1) {
      return await handleMediaGet(req, { id: path[0] });
    }

    return NextResponse.json({ error: "No encontrado" }, { status: 404 });
  } catch (err) {
    console.error("[media]", err);
    return new Response("Error al cargar archivo", { status: 500 });
  }
}

export async function DELETE(_req: Request, context: RouteContext) {
  const path = (await context.params).path ?? [];
  if (path.length !== 2 || path[0] !== "library") {
    return NextResponse.json({ error: "No encontrado" }, { status: 404 });
  }

  const session = await auth();
  if (session?.user?.role !== "ADMIN") {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  try {
    const deleted = await deleteMediaAsset(path[1]);
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
