import { AdminDashboardCards } from "@/components/dashboard/admin-dashboard-cards";
import { AdminDashboardOverviewPanel } from "@/components/dashboard/admin-dashboard-overview";
import { PatientDashboardHome } from "@/components/dashboard/patient-dashboard-home";
import {
  getAdminDashboardOverview,
  getAdminTodayDashboard,
} from "@/server/actions/dashboard.queries";
import { getMyAppointments } from "@/server/actions/booking.queries";
import { getMyAdminResource } from "@/server/actions/patient.queries";
import { getCartCount } from "@/server/actions/cart.actions";
import { getUnreadNotificationCount } from "@/server/actions/notification.actions";
import { getSession } from "@/server/queries/cached-dashboard";

export const dynamic = "force-dynamic";

export default async function DashboardHome() {
  const session = await getSession();
  const name = session?.user?.name ?? "";
  const isPatient = session?.user?.role === "PATIENT";

  const [unreadNotifs, appointments, adminToday, adminOverview, cartCount, adminResource] =
    await Promise.all([
    getUnreadNotificationCount(),
    isPatient ? getMyAppointments() : Promise.resolve([]),
    isPatient ? Promise.resolve(null) : getAdminTodayDashboard(),
    isPatient ? Promise.resolve(null) : getAdminDashboardOverview(),
    isPatient ? getCartCount() : Promise.resolve(0),
    isPatient ? getMyAdminResource() : Promise.resolve(null),
  ]);

  const upcomingCount = appointments.filter(
    (a) =>
      ["PENDING", "CONFIRMED"].includes(a.status) &&
      new Date(a.start) > new Date(),
  ).length;

  if (!isPatient && adminToday) {
    return (
      <div className="space-y-4">
        <div>
          <h1 className="text-xl font-bold sm:text-2xl">Hola, {name}</h1>
          <p className="mt-0.5 text-[10px] font-semibold uppercase tracking-[0.2em] text-accent">
            anttova
          </p>
          <p className="mt-1.5 text-sm text-foreground/60">
            Este es tu panel. Usa el menú lateral para navegar.
          </p>
        </div>

        <AdminDashboardCards
          data={adminToday}
          unreadNotifications={unreadNotifs}
        />

        {adminOverview && (
          <AdminDashboardOverviewPanel overview={adminOverview} />
        )}
      </div>
    );
  }

  return (
    <PatientDashboardHome
      userName={name}
      upcomingAppointments={upcomingCount}
      unreadNotifications={unreadNotifs}
      cartCount={cartCount}
      adminResource={adminResource}
    />
  );
}
