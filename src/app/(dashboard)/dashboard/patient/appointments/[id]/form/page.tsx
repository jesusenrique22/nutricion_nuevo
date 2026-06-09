import { redirect } from "next/navigation";

/** Rutas antiguas con ID en URL → redirige sin exponer el identificador. */
export default async function LegacyAppointmentFormRedirect({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await params;
  redirect("/dashboard/patient/appointments/form");
}
