export type RealtimeScope =
  | "all"
  | "notifications"
  | "appointments"
  | "calendar"
  | "chat"
  | "patients"
  | "progress"
  | "dashboard";

export interface DashboardUpdatePayload {
  scope: RealtimeScope;
  [key: string]: unknown;
}
