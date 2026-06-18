import { AdminDashboardCards } from "@/components/dashboard/admin-dashboard-cards";
import { PatientDashboardHome } from "@/components/dashboard/patient-dashboard-home";
import { getAdminTodayDashboard } from "@/server/actions/dashboard.queries";
import { getMyAppointments } from "@/server/actions/booking.queries";
import { getCartCount } from "@/server/actions/cart.actions";
import {
  getCachedUnreadNotificationCount,
  getSession,
} from "@/server/queries/cached-dashboard";

export const dynamic = "force-dynamic";

export default async function DashboardHome() {
  const session = await getSession();
  const name = session?.user?.name ?? "";
  const isPatient = session?.user?.role === "PATIENT";

  const [unreadNotifs, appointments, adminToday, cartCount] = await Promise.all([
    getCachedUnreadNotificationCount(),
    isPatient ? getMyAppointments() : Promise.resolve([]),
    isPatient ? Promise.resolve(null) : getAdminTodayDashboard(),
    isPatient ? getCartCount() : Promise.resolve(0),
  ]);

  const upcomingCount = appointments.filter(
    (a) =>
      ["PENDING", "CONFIRMED"].includes(a.status) &&
      new Date(a.start) > new Date(),
  ).length;

  if (!isPatient && adminToday) {
    return (
      <div className="flex min-h-[calc(100dvh-5.5rem)] flex-col sm:min-h-[calc(100dvh-7rem)]">
        <div className="shrink-0">
          <h1 className="text-2xl font-bold sm:text-3xl">Hola, {name} 👋</h1>
          <p className="mt-1 text-xs font-semibold uppercase tracking-[0.22em] text-accent">
            anttova
          </p>
          <p className="mt-2 text-foreground/60">
            Este es tu panel. Usa el menú lateral para navegar.
          </p>
        </div>

        <AdminDashboardCards
          data={adminToday}
          unreadNotifications={unreadNotifs}
        />
      </div>
    );
  }

  return (
    <PatientDashboardHome
      userName={name}
      upcomingAppointments={upcomingCount}
      unreadNotifications={unreadNotifs}
      cartCount={cartCount}
    />
  );
}
