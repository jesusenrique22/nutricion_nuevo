"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState, useTransition } from "react";
import { setDefaultCalendarAdminAction } from "@/server/actions/google-calendar.actions";

type ConnectionInfo = {
  connectedEmail: string | null;
  calendarId: string;
  connectedAt: string;
} | null;

const statusMessages: Record<string, string> = {
  connected: "Google Calendar conectado correctamente.",
  denied:
    "Google bloqueó la autorización. Revisá que tu Gmail esté en Test users del OAuth consent screen y que el scope calendar.events esté agregado.",
  invalid_state: "La autorización expiró. Intentá de nuevo.",
  no_refresh: "Google no devolvió token persistente. Desconectá y volvé a conectar.",
  error: "Error al conectar Google Calendar. Revisá el detalle abajo o intentá Desconectar y volver a conectar.",
  missing_config: "Faltan GOOGLE_CALENDAR_CLIENT_ID y CLIENT_SECRET en el servidor.",
};

function GoogleCalendarConnectInner({
  configured,
  connection,
  isDefaultCalendarAdmin,
}: {
  configured: boolean;
  connection: ConnectionInfo;
  isDefaultCalendarAdmin: boolean;
}) {
  const router = useRouter();
  const params = useSearchParams();
  const [message, setMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    const gcal = params.get("gcal");
    const detail = params.get("gcal_detail");
    if (gcal && statusMessages[gcal]) {
      setMessage(
        detail ? `${statusMessages[gcal]} (${detail})` : statusMessages[gcal],
      );
      router.replace("/dashboard/admin/calendar", { scroll: false });
    }
  }, [params, router]);

  if (!configured) {
    return (
      <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
        <p className="font-semibold">Google Calendar sin configurar</p>
        <p className="mt-1 text-xs opacity-80">
          Necesitás OAuth Client ID y Secret (no solo API key). Ver{" "}
          <code className="rounded bg-white/60 px-1">docs/GOOGLE-CALENDAR.md</code>
        </p>
      </div>
    );
  }

  return (
    <div className="mt-4 rounded-2xl border border-foreground/10 bg-white px-4 py-3 text-sm shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="font-semibold text-primary">Google Calendar</p>
          {connection ? (
            <p className="mt-0.5 text-xs text-foreground/60">
              Tu cuenta conectada:{" "}
              <strong>{connection.connectedEmail ?? "cuenta Google"}</strong>
              {isDefaultCalendarAdmin ? (
                <>
                  {" · "}
                  <span className="font-semibold text-primary">
                    Calendario principal para nuevas citas
                  </span>
                </>
              ) : (
                <>
                  {" · "}
                  Las citas nuevas van al admin marcado como principal.
                </>
              )}
            </p>
          ) : (
            <p className="mt-0.5 text-xs text-foreground/60">
              Conectá <strong>tu</strong> Gmail. Cada admin puede vincular su propio
              calendario; las citas se guardan en el calendario del admin principal.
            </p>
          )}
        </div>
        <div className="flex flex-wrap gap-2">
          {connection ? (
            <>
              {!isDefaultCalendarAdmin && (
                <button
                  type="button"
                  disabled={isPending}
                  onClick={() => {
                    startTransition(async () => {
                      const result = await setDefaultCalendarAdminAction();
                      if (result.ok) {
                        setMessage("Este calendario recibirá las nuevas citas.");
                        router.refresh();
                      } else {
                        setMessage(result.message);
                      }
                    });
                  }}
                  className="rounded-full border border-primary/30 bg-primary/5 px-4 py-2 text-xs font-semibold text-primary disabled:opacity-50"
                >
                  Usar para nuevas citas
                </button>
              )}
              <button
                type="button"
                disabled={isPending}
                onClick={() => {
                  startTransition(async () => {
                    await fetch("/api/google/calendar/disconnect", {
                      method: "POST",
                    });
                    router.refresh();
                    setMessage("Google Calendar desconectado.");
                  });
                }}
                className="rounded-full border border-foreground/15 px-4 py-2 text-xs font-semibold disabled:opacity-50"
              >
                Desconectar
              </button>
            </>
          ) : (
            <a
              href="/api/google/calendar/connect"
              className="rounded-full bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground"
            >
              Conectar mi Google Calendar
            </a>
          )}
        </div>
      </div>
      {message && (
        <p className="mt-3 rounded-lg bg-muted px-3 py-2 text-xs">{message}</p>
      )}
    </div>
  );
}

export function GoogleCalendarConnect(props: {
  configured: boolean;
  connection: ConnectionInfo;
  isDefaultCalendarAdmin: boolean;
}) {
  return (
    <Suspense fallback={null}>
      <GoogleCalendarConnectInner {...props} />
    </Suspense>
  );
}
