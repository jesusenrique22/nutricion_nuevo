import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getPaymentCheckoutPolicy } from "@/lib/payment-checkout-policy";
import { validateUploadFile } from "@/lib/upload-policy";
import { storePublicFile } from "@/server/services/file-storage";
import { limitUploadByKey } from "@/lib/ratelimit";

export const maxDuration = 60;

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id || session.user.role !== "PATIENT") {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const rl = await limitUploadByKey(session.user.id);
    if (!rl.success) {
      return NextResponse.json(
        { error: "Demasiadas subidas. Intentá en unos segundos." },
        { status: 429 },
      );
    }

    const policy = await getPaymentCheckoutPolicy();
    const formData = await req.formData();
    const file = formData.get("file");

    if (!(file instanceof File)) {
      return NextResponse.json({ error: "Archivo requerido" }, { status: 400 });
    }

    const validation = validateUploadFile(file, "proof");
    if (!validation.ok) {
      return NextResponse.json({ error: validation.message }, { status: 400 });
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
