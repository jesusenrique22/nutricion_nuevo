import { auth } from "@/lib/auth";
import { AdminDashboardCards } from "@/components/dashboard/admin-dashboard-cards";
import { PatientDashboardHome } from "@/components/dashboard/patient-dashboard-home";
import { getAdminTodayDashboard } from "@/server/actions/dashboard.queries";
import { getUnreadNotificationCount } from "@/server/actions/notification.actions";
import { getPendingFormAppointments } from "@/server/actions/patient.queries";
import { getMyAppointments } from "@/server/actions/booking.queries";

export const dynamic = "force-dynamic";

export default async function DashboardHome() {
  const session = await auth();
  const name = session?.user?.name ?? "";
  const isPatient = session?.user?.role === "PATIENT";

  const [unreadNotifs, pendingForms, appointments, adminToday] =
    await Promise.all([
      getUnreadNotificationCount(),
      isPatient ? getPendingFormAppointments() : Promise.resolve([]),
      isPatient ? getMyAppointments() : Promise.resolve([]),
      isPatient ? Promise.resolve(null) : getAdminTodayDashboard(),
    ]);

  const upcomingCount = appointments.filter(
    (a) =>
      ["PENDING", "CONFIRMED"].includes(a.status) &&
      new Date(a.start) > new Date(),
  ).length;

  if (!isPatient && adminToday) {
    return (
      <div>
        <h1 className="text-2xl font-bold sm:text-3xl">Hola, {name} 👋</h1>
        <p className="mt-1 text-xs font-semibold uppercase tracking-[0.22em] text-accent">
          anttova
        </p>
        <p className="mt-2 text-foreground/60">
          Este es tu panel. Usa el menú lateral para navegar.
        </p>

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
      pendingForms={pendingForms.length}
      upcomingAppointments={upcomingCount}
      unreadNotifications={unreadNotifs}
    />
  );
}
