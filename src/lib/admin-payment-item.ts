import type { AdminPaymentKind } from "@/server/actions/payment-admin.queries";

export type ParsedAdminPaymentItem =
  | { kind: "RESOURCE"; purchaseId: string }
  | { kind: "PRODUCT"; purchaseId: string }
  | { kind: "APPOINTMENT_ADVANCE"; appointmentId: string }
  | { kind: "APPOINTMENT_REMAINDER"; appointmentId: string };

export function parseAdminPaymentItemId(
  id: string,
): ParsedAdminPaymentItem | null {
  if (id.startsWith("resource-")) {
    return { kind: "RESOURCE", purchaseId: id.slice("resource-".length) };
  }
  if (id.startsWith("product-")) {
    return { kind: "PRODUCT", purchaseId: id.slice("product-".length) };
  }
  if (id.startsWith("appt-advance-")) {
    return {
      kind: "APPOINTMENT_ADVANCE",
      appointmentId: id.slice("appt-advance-".length),
    };
  }
  if (id.startsWith("appt-remainder-")) {
    return {
      kind: "APPOINTMENT_REMAINDER",
      appointmentId: id.slice("appt-remainder-".length),
    };
  }
  return null;
}

export function adminPaymentItemId(
  kind: AdminPaymentKind,
  entityId: string,
): string {
  if (kind === "RESOURCE") return `resource-${entityId}`;
  if (kind === "PRODUCT") return `product-${entityId}`;
  if (kind === "APPOINTMENT_ADVANCE") return `appt-advance-${entityId}`;
  return `appt-remainder-${entityId}`;
}
