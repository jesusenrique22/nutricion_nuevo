import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { signOutAction } from "@/server/actions/auth.actions";
import { BackgroundCharacters } from "@/components/brand/background-characters";
import { DashboardSidebar } from "@/components/dashboard/dashboard-sidebar";
import { MessageToastHost } from "@/components/realtime/message-toast-host";
import { RealtimeSync } from "@/components/realtime/realtime-sync";
import { SocketProvider } from "@/contexts/socket-context";
import { getUnreadChatCount } from "@/server/actions/chat.actions";
import { getUnreadNotificationCount } from "@/server/actions/notification.actions";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const isAdmin = session.user.role === "ADMIN";

  const adminLinks = [
    { href: "/dashboard/admin/calendar", label: "Calendario" },
    { href: "/dashboard/admin/patients", label: "Pacientes" },
    { href: "/dashboard/admin/analytics", label: "Estadísticas" },
    { href: "/dashboard/admin/resources", label: "Recursos" },
    { href: "/dashboard/admin/personalizar", label: "Personalizar" },
  ];
  const patientLinks = [
    { href: "/dashboard/patient/appointments", label: "Mis citas" },
    { href: "/dashboard/patient/progress", label: "Estadísticas" },
    { href: "/dashboard/patient/library", label: "Plan alimentación" },
  ];
  const links = isAdmin ? adminLinks : patientLinks;

  const [unreadNotifications, unreadChat] = await Promise.all([
    getUnreadNotificationCount(),
    getUnreadChatCount(),
  ]);

  const signOutButton = (
    <form action={signOutAction}>
      <button className="w-full rounded-xl px-4 py-2.5 text-left font-semibold text-accent-soft transition hover:bg-white/10">
        Cerrar sesión
      </button>
    </form>
  );

  return (
    <SocketProvider userId={session.user.id} role={session.user.role}>
      <RealtimeSync />
      <MessageToastHost />
      <div className="flex h-dvh max-h-dvh flex-col overflow-hidden md:flex-row">
        <DashboardSidebar
          isAdmin={isAdmin}
          links={links}
          initialUnreadNotifications={unreadNotifications}
          initialUnreadChat={unreadChat}
          footer={signOutButton}
        />
        <main className="relative min-h-0 min-w-0 flex-1 overflow-y-auto overflow-x-hidden bg-background px-4 py-4 sm:px-6 sm:py-6 md:p-8">
          <BackgroundCharacters />
          <div className="relative z-10">{children}</div>
        </main>
      </div>
    </SocketProvider>
  );
}
