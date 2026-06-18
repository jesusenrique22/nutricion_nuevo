import { cache } from "react";
import { auth } from "@/lib/auth";
import { getUnreadNotificationCount } from "@/server/actions/notification.actions";

export const getSession = cache(() => auth());

export const getCachedUnreadNotificationCount = cache(() =>
  getUnreadNotificationCount(),
);

export const getDashboardBadges = cache(async () => {
  const notifications = await getCachedUnreadNotificationCount();
  return { notifications };
});
