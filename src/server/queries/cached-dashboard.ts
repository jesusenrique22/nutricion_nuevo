import { cache } from "react";
import { auth } from "@/lib/auth";
import { getUnreadChatCount } from "@/server/actions/chat.actions";
import { getUnreadNotificationCount } from "@/server/actions/notification.actions";

/** Sesión deduplicada por request (layout + páginas hijas). */
export const getSession = cache(() => auth());

export const getCachedUnreadNotificationCount = cache(() =>
  getUnreadNotificationCount(),
);

export const getCachedUnreadChatCount = cache(() => getUnreadChatCount());

export const getDashboardBadges = cache(async () => {
  const [notifications, chat] = await Promise.all([
    getCachedUnreadNotificationCount(),
    getCachedUnreadChatCount(),
  ]);
  return { notifications, chat };
});
