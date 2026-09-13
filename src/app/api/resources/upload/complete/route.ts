import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { isPublicMediaFolder } from "@/lib/media-access-policy";
import { revalidatePublicSiteMediaCache } from "@/lib/public-site-media";
import { completeChunkedUpload } from "@/server/services/chunked-upload.service";
import { registerMediaAsset } from "@/server/services/media-library.service";
import { limitUploadByKey } from "@/lib/ratelimit";

export const maxDuration = 120;

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (session?.user?.role !== "ADMIN") {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const rl = await limitUploadByKey(`admin-chunk-complete:${session.user.id}`);
    if (!rl.success) {
      return NextResponse.json(
        { error: "Demasiadas subidas. Esperá unos segundos." },
        { status: 429 },
      );
    }

    const body = (await req.json()) as { sessionId?: string };
    if (!body.sessionId?.trim()) {
      return NextResponse.json({ error: "Sesión inválida." }, { status: 400 });
    }

    const stored = await completeChunkedUpload({
      sessionId: body.sessionId.trim(),
      ownerId: session.user.id,
    });

    let assetId: string | undefined;
    if (stored.mimeType.startsWith("image/")) {
      const asset = await registerMediaAsset(stored, {
        folder: stored.folder,
        fileName: stored.fileName,
        ownerId: session.user.id,
      });
      assetId = asset.id;
    }

    if (isPublicMediaFolder("resources")) {
      revalidatePublicSiteMediaCache();
      revalidatePath("/");
      revalidatePath("/login");
      revalidatePath("/register");
      revalidatePath("/dashboard/admin/personalizar");
    }

    revalidatePath("/dashboard/admin/resources");

    return NextResponse.json({
      url: stored.url,
      mimeType: stored.mimeType,
      id: assetId,
    });
  } catch (err) {
    console.error("[resources/upload/complete]", err);
    const message =
      err instanceof Error
        ? err.message
        : "No pudimos completar la subida. Intentá de nuevo.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
