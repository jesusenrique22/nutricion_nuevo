import type {
  PatientPendingPaymentItem,
  PatientProgressItem,
} from "@/server/actions/patient-progress.queries";

/** Clave estable por compra/cita para no contar dos veces en «En proceso». */
export function progressProcessingKey(item: PatientProgressItem): string {
  return `${item.kind}:${item.entityId}`;
}

export function pendingPaymentProcessingKey(
  item: PatientPendingPaymentItem,
): string {
  if (item.kind === "RESOURCE") {
    const purchaseId = item.id.replace(/^resource-/, "");
    return `RESOURCE:${purchaseId}`;
  }
  if (item.kind === "APPOINTMENT_ADVANCE") {
    const apptId = item.id.replace(/^appt-advance-/, "");
    return `APPOINTMENT:${apptId}`;
  }
  if (item.kind === "APPOINTMENT_REMAINDER") {
    const apptId = item.id.replace(/^appt-remainder-/, "");
    return `APPOINTMENT:${apptId}`;
  }
  return item.id;
}

/** Ítems del historial que ya están en «Pagos por confirmar». */
export function filterDuplicateProcessingProgress(
  progressItems: PatientProgressItem[],
  pendingPayments: PatientPendingPaymentItem[],
): PatientProgressItem[] {
  const pendingKeys = new Set(
    pendingPayments.map((p) => pendingPaymentProcessingKey(p)),
  );
  return progressItems.filter(
    (item) => !pendingKeys.has(progressProcessingKey(item)),
  );
}

export function uniqueProcessingCount(
  progressItems: PatientProgressItem[],
  pendingPayments: PatientPendingPaymentItem[],
): number {
  const keys = new Set<string>();
  for (const p of pendingPayments) {
    keys.add(pendingPaymentProcessingKey(p));
  }
  for (const item of filterDuplicateProcessingProgress(
    progressItems,
    pendingPayments,
  )) {
    keys.add(progressProcessingKey(item));
  }
  return keys.size;
}
