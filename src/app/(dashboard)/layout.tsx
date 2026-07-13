import { redirect } from "next/navigation";
import { signOut } from "@/lib/auth";
import { signOutAction } from "@/server/actions/auth.actions";
import { DashboardSidebar } from "@/components/dashboard/dashboard-sidebar";
import { DashboardMain } from "@/components/dashboard/dashboard-main";
import { RealtimeSync } from "@/components/realtime/realtime-sync";
import { SocketProvider } from "@/contexts/socket-context";
import { isSocketClientEnabled } from "@/lib/socket-config";
import { getSession } from "@/server/queries/cached-dashboard";
import { isPatientDeactivated } from "@/server/queries/patient-profile";
import { getCartCount } from "@/server/actions/cart.actions";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();
  if (!session?.user) redirect("/login");

  const isAdmin = session.user.role === "ADMIN";

  if (!isAdmin && (await isPatientDeactivated(session.user.id))) {
    await signOut({ redirectTo: "/login?deactivated=1" });
  }

  const adminLinks = [
    { href: "/dashboard/admin/calendar", label: "Calendario" },
    { href: "/dashboard/admin/patients", label: "Pacientes" },
    { href: "/dashboard/admin/precios-pagos", label: "Precios y Cotización" },
    { href: "/dashboard/admin/payments", label: "Pagos" },
    { href: "/dashboard/admin/analytics", label: "Estadísticas" },
    { href: "/dashboard/admin/resources", label: "Recursos" },
    { href: "/dashboard/admin/reviews", label: "Reseñas" },
    { href: "/dashboard/admin/personalizar", label: "Personalizar" },
  ];
  const patientLinks = [
    { href: "/dashboard/patient/progress", label: "Mi progreso" },
    { href: "/dashboard/patient/appointments", label: "Mis citas" },
    { href: "/dashboard/patient/library", label: "Recursos" },
    { href: "/dashboard/patient/products", label: "Productos" },
    { href: "/dashboard/patient/reviews", label: "Reseñas" },
    { href: "/dashboard/patient/cart", label: "Carrito" },
  ];
  const links = isAdmin ? adminLinks : patientLinks;
  const cartCount = isAdmin ? 0 : await getCartCount();

  const signOutButton = (
    <form action={signOutAction}>
      <button className="flex w-full items-center gap-2 rounded-xl px-3 py-2.5 text-left text-sm font-semibold text-accent-soft transition hover:bg-white/10">
        Cerrar sesión
      </button>
    </form>
  );

  const socketEnabled = isSocketClientEnabled();

  const dashboard = (
    <div className="flex h-dvh max-h-dvh flex-col overflow-hidden md:flex-row">
      <DashboardSidebar
        isAdmin={isAdmin}
        links={links}
        footer={signOutButton}
        cartCount={cartCount}
      />
      <main className="scrollbar-stable relative flex min-h-0 min-w-0 flex-1 flex-col overflow-y-auto bg-background/70 backdrop-blur-[1px]">
        <div className="relative z-10 flex min-h-0 w-full flex-1 flex-col">
          <DashboardMain>{children}</DashboardMain>
        </div>
      </main>
    </div>
  );

  if (!socketEnabled) {
    return dashboard;
  }

  return (
    <SocketProvider userId={session.user.id} role={session.user.role}>
      <RealtimeSync />
      {dashboard}
    </SocketProvider>
  );
}
