import { NotificationsList } from "@/components/notifications/notifications-list";
import { getNotifications } from "@/server/actions/notification.actions";

export const dynamic = "force-dynamic";

export default async function NotificationsPage() {
  const notifications = await getNotifications();

  return <NotificationsList initialNotifications={notifications} />;
}
