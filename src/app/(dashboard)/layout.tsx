import { redirect } from "next/navigation";
import { signOut } from "@/lib/auth";
import { signOutAction } from "@/server/actions/auth.actions";
import { BackgroundCharacters } from "@/components/brand/background-characters";
import { DashboardSidebar } from "@/components/dashboard/dashboard-sidebar";
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
    { href: "/dashboard/admin/personalizar", label: "Personalizar" },
  ];
  const patientLinks = [
    { href: "/dashboard/patient/progress", label: "Mi progreso" },
    { href: "/dashboard/patient/appointments", label: "Mis citas" },
    { href: "/dashboard/patient/library", label: "Recursos" },
    { href: "/dashboard/patient/products", label: "Productos" },
    { href: "/dashboard/patient/cart", label: "Carrito" },
  ];
  const links = isAdmin ? adminLinks : patientLinks;
  const cartCount = isAdmin ? 0 : await getCartCount();

  const signOutButton = (
    <form action={signOutAction}>
      <button className="w-full rounded-xl px-4 py-2.5 text-left font-semibold text-accent-soft transition hover:bg-white/10">
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
      <main className="scrollbar-stable relative flex min-h-0 min-w-0 flex-1 flex-col overflow-y-auto bg-background">
        <BackgroundCharacters />
        <div className="relative z-10 flex min-h-0 w-full flex-1 flex-col">
          <div className="mx-auto flex w-full min-w-0 max-w-7xl flex-1 flex-col px-4 pt-4 pb-10 sm:px-6 sm:pt-6 sm:pb-12 md:px-8 md:pt-8 md:pb-14">
            {children}
          </div>
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
