import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getPaymentCheckoutPolicy } from "@/lib/payment-checkout-policy";
import { storePublicFile } from "@/server/services/file-storage";

const MAX_BYTES = 8 * 1024 * 1024;
const ALLOWED = new Set(["image/jpeg", "image/png", "image/webp"]);

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id || session.user.role !== "PATIENT") {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const policy = await getPaymentCheckoutPolicy();
    const formData = await req.formData();
    const file = formData.get("file");

    if (!(file instanceof File)) {
      return NextResponse.json({ error: "Archivo requerido" }, { status: 400 });
    }

    if (file.size > MAX_BYTES) {
      return NextResponse.json(
        { error: "La imagen es demasiado grande (máx. 8 MB)." },
        { status: 400 },
      );
    }

    if (!ALLOWED.has(file.type)) {
      return NextResponse.json(
        { error: "Solo se permiten imágenes JPG, PNG o WebP." },
        { status: 400 },
      );
    }

    const stored = await storePublicFile(file, "payment-proofs", {
      ownerId: session.user.id,
    });

    return NextResponse.json({
      url: stored.url,
      mimeType: stored.mimeType,
      maxProofFiles: policy.maxProofFiles,
    });
  } catch (err) {
    console.error("[payments/upload-proof]", err);
    const message =
      err instanceof Error ? err.message : "Error al subir la captura.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
