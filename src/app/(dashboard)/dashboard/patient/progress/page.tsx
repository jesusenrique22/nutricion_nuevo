import { redirect } from "next/navigation";

/** Mi progreso se movió al historial del carrito. */
export default async function PatientProgressRedirect({
  searchParams,
}: {
  searchParams: Promise<{ pedido?: string }>;
}) {
  const params = await searchParams;
  const qs = params.pedido === "ok" ? "?pedido=ok" : "";
  redirect(`/dashboard/patient/cart/historial${qs}`);
}
