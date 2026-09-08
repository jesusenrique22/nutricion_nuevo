import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { listMediaAssets } from "@/server/services/media-library.service";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (session?.user?.role !== "ADMIN") {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const folder = req.nextUrl.searchParams.get("folder") ?? "site";
  if (!/^[\w-]+$/.test(folder)) {
    return NextResponse.json({ error: "Carpeta inválida" }, { status: 400 });
  }

  try {
    const items = await listMediaAssets(folder);
    return NextResponse.json({ items });
  } catch (err) {
    console.error("[media/library]", err);
    return NextResponse.json(
      { error: "No pudimos cargar la biblioteca. Intentá de nuevo." },
      { status: 500 },
    );
  }
}
