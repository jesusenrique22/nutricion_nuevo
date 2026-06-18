import { redirect } from "next/navigation";

/** Chat deshabilitado — redirige al dashboard. */
export default function ChatPage() {
  redirect("/dashboard");
}
