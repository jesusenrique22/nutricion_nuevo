"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState, useTransition } from "react";
import {
  setDefaultCalendarAdminAction,
  syncExistingAppointmentsAction,
} from "@/server/actions/google-calendar.actions";

type ConnectionInfo = {
  connectedEmail: string | null;
  calendarId: string;
  connectedAt: string;
} | null;

const statusMessages: Record<string, string> = {
  connected:
    "Google Calendar conectado. Solo se sincronizan citas desde hoy en adelante; las nuevas se agregan solas al crearlas.",
  denied:
    "No se pudo autorizar Google Calendar. Revisá que tu cuenta tenga permiso e intentá de nuevo.",
  invalid_state: "La autorización expiró. Intentá de nuevo.",
  no_refresh:
    "No se pudo completar la conexión con Google. Desconectá la app desde tu cuenta de Google y volvé a conectar.",
  error:
    "No se pudo conectar Google Calendar. Intentá de nuevo en unos minutos.",
  missing_config:
    "La conexión con Google Calendar no está disponible en este momento.",
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
  const [messageTone, setMessageTone] = useState<"info" | "success" | "error">(
    "info",
  );
  const [isPending, startTransition] = useTransition();
  const [autoSyncDone, setAutoSyncDone] = useState(false);

  useEffect(() => {
    const gcal = params.get("gcal");
    const shouldSync = params.get("sync") === "1";

    if (gcal && statusMessages[gcal]) {
      setMessageTone(gcal === "connected" ? "success" : gcal === "error" ? "error" : "info");
      setMessage(statusMessages[gcal]);
      router.replace("/dashboard/admin/calendar", { scroll: false });

      if (gcal === "connected" && shouldSync && !autoSyncDone) {
        setAutoSyncDone(true);
        startTransition(async () => {
          const result = await syncExistingAppointmentsAction();
          if (result.ok && result.synced > 0) {
            setMessageTone("success");
            setMessage(
              `Google Calendar conectado. Sincronizadas ${result.synced} cita(s) desde hoy en adelante.`,
            );
            router.refresh();
          }
        });
      }
    }
  }, [params, router, autoSyncDone]);

  const messageClassName =
    messageTone === "success"
      ? "mt-3 rounded-lg bg-emerald-50 px-3 py-2 text-xs text-emerald-900"
      : messageTone === "error"
        ? "mt-3 rounded-lg bg-red-50 px-3 py-2 text-xs text-red-900"
        : "mt-3 rounded-lg bg-muted px-3 py-2 text-xs";

  if (!configured) {
    return (
      <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
        <p className="font-semibold">Google Calendar sin configurar</p>
        <p className="mt-1 text-xs opacity-80">
          Necesitás OAuth Client ID y Secret (no solo API key). Ver{" "}
          <code className="rounded bg-white/60 px-1">DOCUMENTACION.md § Google Calendar</code>
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
                        setMessageTone("success");
                        setMessage("Este calendario recibirá las nuevas citas.");
                        router.refresh();
                      } else {
                        setMessageTone("error");
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
                    const result = await syncExistingAppointmentsAction();
                    if (result.ok) {
                      if (result.synced > 0) {
                        setMessageTone("success");
                        setMessage(
                          `Sincronizadas ${result.synced} cita(s) desde hoy en adelante. Las nuevas se agregan solas.`,
                        );
                      } else if (result.failed > 0) {
                        setMessageTone("error");
                        setMessage(
                          `No se pudieron sincronizar ${result.failed} cita(s). Revisá los logs del servidor.`,
                        );
                      } else if (result.alreadySynced > 0) {
                        setMessageTone("success");
                        setMessage(
                          `Todo al día: ${result.alreadySynced} cita(s) desde hoy ya están en Google. Las nuevas se sincronizan solas. Las anteriores no se envían.`,
                        );
                      } else {
                        setMessageTone("info");
                        setMessage(
                          result.skippedPast > 0
                            ? `No hay citas desde hoy para sincronizar (${result.skippedPast} anteriores se omitieron a propósito).`
                            : "No hay citas programadas desde hoy en adelante para sincronizar.",
                        );
                      }
                      router.refresh();
                    } else {
                      setMessageTone("error");
                      setMessage(result.message);
                    }
                  });
                }}
                className="rounded-full border border-foreground/15 px-4 py-2 text-xs font-semibold disabled:opacity-50"
              >
                Sincronizar desde hoy
              </button>
              <button
                type="button"
                disabled={isPending}
                onClick={() => {
                  startTransition(async () => {
                    await fetch("/api/google/calendar/disconnect", {
                      method: "POST",
                    });
                    router.refresh();
                    setMessageTone("info");
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
      {message && <p className={messageClassName}>{message}</p>}
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
