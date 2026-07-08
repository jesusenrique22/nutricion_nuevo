import type { PatientProgressItem } from "@/server/actions/patient-progress.queries";

export function isPendingProgressItem(item: PatientProgressItem): boolean {
  return (
    item.statusLabel === "Pago en revisión" ||
    item.statusLabel === "Adelanto en revisión"
  );
}
