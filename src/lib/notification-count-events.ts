export const NOTIFICATION_COUNT_EVENT = "nutricion:notification-count";

export type NotificationCountEventDetail =
  | { delta: number }
  | { count: number };

export function dispatchNotificationCountUpdate(
  detail: NotificationCountEventDetail,
) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(
    new CustomEvent<NotificationCountEventDetail>(NOTIFICATION_COUNT_EVENT, {
      detail,
    }),
  );
}
