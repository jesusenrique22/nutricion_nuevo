import type { PatientProgressItem } from "@/server/actions/patient-progress.queries";

export type OrderHistoryBucket = "purchased" | "processing" | "cancelled";

/** Agrupa ítems del historial para las pestañas del carrito. */
export function getOrderHistoryBucket(
  item: PatientProgressItem,
): OrderHistoryBucket {
  const label = item.statusLabel;
  if (
    label === "Cancelada" ||
    label === "Reembolsado" ||
    label === "Reembolso no aceptado"
  ) {
    return "cancelled";
  }
  if (
    label === "Pago en revisión" ||
    label === "Procesando pago" ||
    label === "Procesando adelanto" ||
    label === "Pago en revisión" ||
    label === "Adelanto en revisión" ||
    label === "Reembolso en revisión"
  ) {
    return "processing";
  }
  return "purchased";
}

export function isPendingProgressItem(item: PatientProgressItem): boolean {
  return getOrderHistoryBucket(item) === "processing";
}
