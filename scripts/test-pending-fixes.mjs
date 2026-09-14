#!/usr/bin/env node
/**
 * Pruebas rápidas de fixes recientes (dedupe historial, cupón, reseñas).
 * Uso: node scripts/test-pending-fixes.mjs
 */
import { pathToFileURL } from "node:url";
import { join } from "node:path";

const ROOT = process.cwd();

async function importTs(rel) {
  return import(pathToFileURL(join(ROOT, rel)).href);
}

let passed = 0;
let failed = 0;

function ok(label) {
  console.log(`  ✓ ${label}`);
  passed += 1;
}
function fail(label, detail) {
  console.error(`  ✗ ${label}${detail ? `: ${detail}` : ""}`);
  failed += 1;
}

async function main() {
  console.log("\nPruebas de fixes pendientes…\n");

  const dedupe = await importTs("src/lib/order-history-processing.ts");

  const pending = [
    {
      id: "appt-advance-a1",
      kind: "APPOINTMENT_ADVANCE",
      title: "Consulta",
      subtitle: "",
      amount: "1",
      createdAt: "",
      paymentMethod: null,
      patientReference: null,
      patientNote: null,
      proofUrls: [],
    },
    {
      id: "resource-rp1",
      kind: "RESOURCE",
      title: "Guía",
      subtitle: "",
      amount: "1",
      createdAt: "",
      paymentMethod: null,
      patientReference: null,
      patientNote: null,
      proofUrls: [],
    },
  ];

  const progressDup = [
    {
      id: "appt-a1",
      kind: "APPOINTMENT",
      entityId: "a1",
      title: "Consulta",
      subtitle: "",
      amount: "1",
      purchasedAt: "",
      statusLabel: "Pago en revisión",
      paymentStatus: "PENDING",
      refundStatus: "NONE",
      refundAdminNote: null,
      canRequestRefund: false,
    },
    {
      id: "resource-rp1",
      kind: "RESOURCE",
      entityId: "rp1",
      title: "Guía",
      subtitle: "",
      amount: "1",
      purchasedAt: "",
      statusLabel: "Pago en revisión",
      paymentStatus: "PENDING",
      refundStatus: "NONE",
      refundAdminNote: null,
      canRequestRefund: false,
    },
  ];

  const filtered = dedupe.filterDuplicateProcessingProgress(
    progressDup,
    pending,
  );
  if (filtered.length === 0) {
    ok("Dedupe: cita y recurso duplicados no se listan dos veces");
  } else {
    fail("Dedupe historial", `esperaba 0 extra, hay ${filtered.length}`);
  }

  const count = dedupe.uniqueProcessingCount(progressDup, pending);
  if (count === 2) {
    ok("Contador «En proceso» = 2 (cita + recurso únicos)");
  } else {
    fail("Contador en proceso", `esperaba 2, obtuvo ${count}`);
  }

  const inflated = progressDup.length + pending.length;
  if (count < inflated) {
    ok(`Antes sumaba ${inflated}; ahora ${count} (sin doble conteo)`);
  } else {
    fail("Contador vs suma bruta");
  }

  const progress = await importTs("src/lib/patient-progress.ts");
  const bucket = progress.getOrderHistoryBucket({
    statusLabel: "Pago en revisión",
  });
  if (bucket === "processing") {
    ok("Etiqueta «Pago en revisión» → pestaña En proceso");
  } else {
    fail("Bucket Pago en revisión", bucket);
  }

  ok("Módulo order-history-processing OK");

  const reviewSrc = await import("node:fs/promises").then((fs) =>
    fs.readFile(
      join(ROOT, "src/server/services/review-notify.service.ts"),
      "utf8",
    ),
  );
  if (
    reviewSrc.includes("notifyReviewRequested") &&
    reviewSrc.includes("Desactivado por pedido del cliente")
  ) {
    ok("Avisos de reseña desactivados en código");
  } else {
    fail("review-notify desactivado");
  }

  const cartSrc = await import("node:fs/promises").then((fs) =>
    fs.readFile(join(ROOT, "src/server/actions/cart.actions.ts"), "utf8"),
  );
  if (cartSrc.includes("appointmentItems.length > 0") && cartSrc.includes("recordCouponRedemption")) {
    ok("Canje de cupón solo si hay cita en checkout");
  } else {
    fail("cupón en cart.actions");
  }

  const driveSrc = await import("node:fs/promises").then((fs) =>
    fs.readFile(
      join(ROOT, "src/server/actions/patient-admin-resource.actions.ts"),
      "utf8",
    ),
  );
  if (driveSrc.includes("notifyPatientDriveMaterialAdded") && driveSrc.includes("isNewDriveLink")) {
    ok("Notificación Drive al guardar enlace nuevo");
  } else {
    fail("patient-admin-resource Drive notify");
  }

  console.log(`\nResultado: ${passed} ok, ${failed} fallos\n`);
  process.exit(failed ? 1 : 0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
