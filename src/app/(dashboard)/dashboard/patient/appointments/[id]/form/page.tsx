import { redirect } from "next/navigation";

export default function LegacyAppointmentFormPage() {
  redirect("/dashboard/patient/appointments");
}
