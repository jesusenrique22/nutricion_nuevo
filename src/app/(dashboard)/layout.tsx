import { redirect } from "next/navigation";
import { signOut } from "@/lib/auth";
import { SignOutButton } from "@/components/auth/sign-out-button";
import { DashboardSidebar } from "@/components/dashboard/dashboard-sidebar";
import { DashboardMain } from "@/components/dashboard/dashboard-main";
import { RealtimeSync } from "@/components/realtime/realtime-sync";
import { SocketProvider } from "@/contexts/socket-context";
import { isSocketClientEnabled } from "@/lib/socket-config";
import { getSession, getDashboardBadges } from "@/server/queries/cached-dashboard";
import { isPatientDeactivated } from "@/server/queries/patient-profile";
import { getCartCount } from "@/server/actions/cart.actions";
import { getNavMenu, getProducts } from "@/server/queries/landing.queries";
import { isStoreVisible, storeNavLabel } from "@/lib/store-visibility";
import { prisma } from "@/server/db/prisma";
import { MissingPhoneGate } from "@/components/auth/missing-phone-gate";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();
  if (!session?.user) redirect("/login");

  // Verificar que el usuario aún existe en la BD.
  // Protege contra sesiones JWT con IDs de usuarios eliminados.
  let dbUser: { id: string; phone: string | null } | null = null;
  try {
    dbUser = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { id: true, phone: true },
    });
    if (!dbUser) {
      // Sesión huérfana: el usuario fue eliminado de la BD.
      await signOut({ redirect: false });
      redirect("/login");
    }
  } catch {
    // Si la BD no responde, continuar (evitar loop de login).
  }

  const isAdmin = session.user.role === "ADMIN";
  const needsPhone =
    !isAdmin && Boolean(dbUser) && !dbUser?.phone?.trim();

  if (!isAdmin && (await isPatientDeactivated(session.user.id))) {
    await signOut({ redirectTo: "/login?deactivated=1" });
  }

  const adminLinks = [
    { href: "/dashboard/admin/calendar", label: "Calendario" },
    { href: "/dashboard/admin/patients", label: "Pacientes" },
    { href: "/dashboard/admin/precios-pagos", label: "Precios y Cotización" },
    { href: "/dashboard/admin/cupones", label: "Cupones" },
    { href: "/dashboard/admin/payments", label: "Pagos" },
    { href: "/dashboard/admin/analytics", label: "Estadísticas" },
    { href: "/dashboard/admin/resources", label: "Recursos" },
    { href: "/dashboard/admin/reviews", label: "Reseñas" },
    { href: "/dashboard/admin/personalizar", label: "Personalizar" },
  ];

  let patientLinks = [
    { href: "/dashboard/patient/appointments", label: "Mis citas" },
    { href: "/dashboard/patient/library", label: "Recursos" },
    { href: "/dashboard/patient/reviews", label: "Reseñas" },
    { href: "/dashboard/patient/cart", label: "Carrito" },
  ];

  const storePromise = isAdmin
    ? Promise.resolve(null as null)
    : Promise.all([getNavMenu(), getProducts()]);

  const [storeData, cartCount, badges] = await Promise.all([
    storePromise,
    isAdmin ? Promise.resolve(0) : getCartCount(),
    getDashboardBadges(),
  ]);

  if (storeData && isStoreVisible(storeData[0], storeData[1])) {
    patientLinks = [
      patientLinks[0]!,
      patientLinks[1]!,
      {
        href: "/dashboard/patient/products",
        label: storeNavLabel(storeData[0]),
      },
      ...patientLinks.slice(2),
    ];
  }

  const links = isAdmin ? adminLinks : patientLinks;

  const signOutButton = (
    <SignOutButton
      redirectTo="/"
      className="flex w-full items-center gap-2 rounded-xl px-3 py-2.5 text-left text-sm font-semibold text-accent-soft transition hover:bg-white/10 disabled:opacity-50"
    />
  );

  const socketEnabled = isSocketClientEnabled();

  const dashboard = (
    <div className="flex h-dvh max-h-dvh flex-col overflow-hidden md:flex-row">
      <DashboardSidebar
        isAdmin={isAdmin}
        links={links}
        footer={signOutButton}
        cartCount={cartCount}
        initialUnreadNotifications={badges.notifications}
      />
      <main className="scrollbar-stable relative flex min-h-0 min-w-0 flex-1 flex-col overflow-y-auto bg-background/70 backdrop-blur-[1px]">
        <div className="relative z-10 flex min-h-0 w-full flex-1 flex-col">
          <DashboardMain>{children}</DashboardMain>
        </div>
      </main>
      {needsPhone ? <MissingPhoneGate /> : null}
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
