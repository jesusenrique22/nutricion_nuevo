import type { NotificationDTO } from "@/server/actions/notification.actions";

const APPOINTMENT_NOTIFICATION_TYPES = new Set([
  "APPOINTMENT_CONFIRMED",
  "APPOINTMENT_REMINDER",
  "APPOINTMENT_CANCELLED",
]);

function str(value: unknown): string | null {
  return typeof value === "string" && value.length > 0 ? value : null;
}

/** Destino del enlace «Ver» según rol y contenido de la notificación. */
export function resolveNotificationHref(
  notification: NotificationDTO,
  isAdmin: boolean,
): string | null {
  const payload = notification.payload;
  if (!payload) return null;

  const appointmentId = str(payload.appointmentId);
  const patientId = str(payload.patientId);
  const entityId = str(payload.entityId);
  const itemKind = str(payload.itemKind);
  const deepLink = str(payload.deepLink);

  if (isAdmin) {
    if (
      appointmentId &&
      APPOINTMENT_NOTIFICATION_TYPES.has(notification.type)
    ) {
      return `/dashboard/admin/calendar?appointmentId=${encodeURIComponent(appointmentId)}`;
    }

    if (notification.type === "REFUND_REQUESTED") {
      if (itemKind === "APPOINTMENT" && entityId) {
        return `/dashboard/admin/calendar?appointmentId=${encodeURIComponent(entityId)}`;
      }
      if (patientId) {
        return `/dashboard/admin/patients/${encodeURIComponent(patientId)}`;
      }
    }

    if (patientId && notification.type !== "REVIEW_SUBMITTED") {
      const looksLikePatientFicha =
        deepLink?.includes("/dashboard/admin/patients/") ||
        itemKind === "RESOURCE" ||
        notification.type === "REFUND_REQUESTED";

      if (looksLikePatientFicha) {
        return `/dashboard/admin/patients/${encodeURIComponent(patientId)}`;
      }
    }
  }

  return deepLink;
}
