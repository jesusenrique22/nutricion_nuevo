"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { dispatchNotificationCountUpdate } from "@/lib/notification-count-events";
import { safeRouterRefresh } from "@/lib/safe-router";
import type { NotificationDTO } from "@/server/actions/notification.actions";
import {
  markAllNotificationsRead,
  markNotificationRead,
} from "@/server/actions/notification.actions";

function fmt(iso: string) {
  return new Date(iso).toLocaleString("es", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function NotificationsList({
  initialNotifications,
}: {
  initialNotifications: NotificationDTO[];
}) {
  const router = useRouter();
  const [notifications, setNotifications] = useState(initialNotifications);
  const [isPending, startTransition] = useTransition();

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  function markReadLocally(id: string) {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, isRead: true } : n)),
    );
  }

  function markAllReadLocally() {
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
  }

  function handleMarkRead(id: string) {
    const target = notifications.find((n) => n.id === id);
    if (!target || target.isRead) return;

    markReadLocally(id);
    dispatchNotificationCountUpdate({ delta: -1 });

    startTransition(async () => {
      const res = await markNotificationRead(id);
      if (!res.ok) {
        dispatchNotificationCountUpdate({ delta: 1 });
        safeRouterRefresh(router);
        return;
      }
      safeRouterRefresh(router);
    });
  }

  function handleMarkAllRead() {
    const unread = notifications.filter((n) => !n.isRead).length;
    if (unread === 0) return;

    markAllReadLocally();
    dispatchNotificationCountUpdate({ count: 0 });

    startTransition(async () => {
      await markAllNotificationsRead();
      safeRouterRefresh(router);
    });
  }

  function handleViewLink(id: string) {
    const target = notifications.find((n) => n.id === id);
    if (!target || target.isRead) return;
    handleMarkRead(id);
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <h1 className="text-2xl font-bold sm:text-3xl">Notificaciones</h1>
          <p className="mt-2 text-sm text-foreground/60 sm:text-base">
            Recordatorios y alertas de tu cuenta.
          </p>
        </div>
        {unreadCount > 0 && (
          <button
            type="button"
            onClick={handleMarkAllRead}
            disabled={isPending}
            className="shrink-0 self-start rounded-full border border-foreground/15 px-4 py-2 text-sm font-semibold hover:bg-muted disabled:opacity-50"
          >
            Marcar todas leídas
          </button>
        )}
      </div>

      <div className="space-y-3">
        {notifications.length === 0 && (
          <div className="rounded-2xl border border-foreground/10 bg-white p-8 text-center text-foreground/50">
            No tienes notificaciones.
          </div>
        )}
        {notifications.map((n) => (
          <div
            key={n.id}
            className={`rounded-2xl border p-4 transition ${
              n.isRead
                ? "border-foreground/10 bg-white"
                : "border-primary/20 bg-primary/5"
            }`}
          >
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0 flex-1">
                <div className="font-semibold">{n.title}</div>
                <p className="mt-1 text-sm text-foreground/70">{n.body}</p>
                <span className="mt-2 block text-xs text-foreground/40">
                  {fmt(n.createdAt)}
                </span>
                {typeof n.payload?.deepLink === "string" ? (
                  <Link
                    href={n.payload.deepLink}
                    onClick={() => handleViewLink(n.id)}
                    className="mt-2 inline-block text-sm font-semibold text-primary hover:underline"
                  >
                    Ver →
                  </Link>
                ) : null}
              </div>
              {!n.isRead ? (
                <button
                  type="button"
                  onClick={() => handleMarkRead(n.id)}
                  disabled={isPending}
                  className="shrink-0 text-xs font-semibold text-primary hover:underline disabled:opacity-50"
                >
                  Leída
                </button>
              ) : (
                <span className="shrink-0 text-xs font-medium text-foreground/40">
                  Leída
                </span>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
