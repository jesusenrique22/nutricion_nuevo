import { redirect } from "next/navigation";

export default function PatientFormPage() {
  redirect("/dashboard/patient/appointments");
}
