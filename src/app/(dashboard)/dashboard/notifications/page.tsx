import { NotificationsList } from "@/components/notifications/notifications-list";
import { DashboardPage } from "@/components/dashboard/dashboard-page";
import { getNotifications } from "@/server/actions/notification.actions";

export const dynamic = "force-dynamic";

export default async function NotificationsPage() {
  const notifications = await getNotifications();

  return (
    <DashboardPage>
      <NotificationsList initialNotifications={notifications} />
    </DashboardPage>
  );
}
