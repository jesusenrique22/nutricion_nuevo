import Link from "next/link";
import {
  getNotifications,
  markAllNotificationsRead,
  markNotificationRead,
} from "@/server/actions/notification.actions";

export const dynamic = "force-dynamic";

function fmt(iso: string) {
  return new Date(iso).toLocaleString("es", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default async function NotificationsPage() {
  const notifications = await getNotifications();

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Notificaciones</h1>
          <p className="mt-2 text-foreground/60">
            Recordatorios y alertas de tu cuenta.
          </p>
        </div>
        {notifications.some((n) => !n.isRead) && (
          <form action={markAllNotificationsRead}>
            <button className="rounded-full border border-foreground/15 px-4 py-2 text-sm font-semibold hover:bg-muted">
              Marcar todas leídas
            </button>
          </form>
        )}
      </div>

      <div className="mt-8 space-y-3">
        {notifications.length === 0 && (
          <div className="rounded-2xl border border-foreground/10 bg-white p-8 text-center text-foreground/50">
            No tienes notificaciones.
          </div>
        )}
        {notifications.map((n) => (
          <div
            key={n.id}
            className={`rounded-2xl border p-4 ${
              n.isRead
                ? "border-foreground/10 bg-white"
                : "border-primary/20 bg-primary/5"
            }`}
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="font-semibold">{n.title}</div>
                <p className="mt-1 text-sm text-foreground/70">{n.body}</p>
                <span className="mt-2 block text-xs text-foreground/40">
                  {fmt(n.createdAt)}
                </span>
                {typeof n.payload?.deepLink === "string" ? (
                  <Link
                    href={n.payload.deepLink}
                    className="mt-2 inline-block text-sm font-semibold text-primary hover:underline"
                  >
                    Ver →
                  </Link>
                ) : null}
              </div>
              {!n.isRead && (
                <form
                  action={async () => {
                    "use server";
                    await markNotificationRead(n.id);
                  }}
                >
                  <button className="text-xs font-semibold text-primary hover:underline">
                    Leída
                  </button>
                </form>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
