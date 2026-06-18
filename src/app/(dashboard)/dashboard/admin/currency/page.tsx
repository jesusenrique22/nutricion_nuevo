import { redirect } from "next/navigation";

export default function AdminCurrencyRedirectPage() {
  redirect("/dashboard/admin/precios-pagos");
}
