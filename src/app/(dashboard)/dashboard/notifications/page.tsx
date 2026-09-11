import { NotificationsList } from "@/components/notifications/notifications-list";
import { DashboardPage } from "@/components/dashboard/dashboard-page";
import { auth } from "@/lib/auth";
import { getNotifications } from "@/server/actions/notification.actions";

export const dynamic = "force-dynamic";

export default async function NotificationsPage() {
  const session = await auth();
  const notifications = await getNotifications();
  const isAdmin = session?.user?.role === "ADMIN";

  return (
    <DashboardPage>
      <NotificationsList
        initialNotifications={notifications}
        isAdmin={isAdmin}
      />
    </DashboardPage>
  );
}
