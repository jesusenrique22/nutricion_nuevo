"use client";

import Link from "next/link";
import { ArrowRightIcon } from "@/components/ui/link-icons";
import { useLiveCounter } from "@/hooks/use-live-counter";
import type { AdminTodayDashboard } from "@/server/actions/dashboard.queries";

const CARD_SHELL_CLASS =
  "group flex h-full flex-col rounded-2xl border border-foreground/10 bg-white p-4 transition hover:border-primary/20 hover:shadow-sm";

const CARD_BODY_CLASS =
  "mt-2 flex min-h-0 flex-1 flex-col rounded-xl border border-foreground/8 bg-gradient-to-br from-muted/35 to-white p-3.5";

function NoteCard({
  title,
  href,
  children,
}: {
  title: string;
  href: string;
  children: React.ReactNode;
}) {
  return (
    <Link href={href} className={CARD_SHELL_CLASS}>
      <div className="flex items-center justify-between gap-2">
        <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-foreground/45">
          {title}
        </span>
        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-accent opacity-60 transition group-hover:opacity-100">
          Ver
          <ArrowRightIcon className="h-3 w-3" />
        </span>
      </div>
      <div className={CARD_BODY_CLASS}>{children}</div>
    </Link>
  );
}

function LiveNotificationsCard({ initialCount }: { initialCount: number }) {
  const count = useLiveCounter(initialCount, { onNotificationEvents: true });

  return (
    <NoteCard title="Notificaciones" href="/dashboard/notifications">
      <p className="text-xs text-foreground/55">Sin leer</p>
      <p className="mt-1 text-3xl font-extrabold tabular-nums text-primary">
        {count}
      </p>
      {count > 0 && (
        <p className="mt-1 text-xs font-semibold text-accent">
          Tienes alertas nuevas
        </p>
      )}
    </NoteCard>
  );
}

function AppointmentPreviewItem({
  patientName,
  time,
  modalityLabel,
  consultationName,
}: {
  patientName: string;
  time: string;
  modalityLabel: string;
  consultationName: string;
}) {
  return (
    <li className="rounded-lg border border-foreground/6 bg-white/70 px-2.5 py-2">
      <div className="flex items-center justify-between gap-2">
        <span className="truncate text-xs font-bold">{patientName}</span>
        <span className="shrink-0 text-xs font-semibold text-primary">
          {time}
        </span>
      </div>
      <div className="mt-1 flex min-w-0 flex-wrap gap-1">
        <span className="max-w-full truncate rounded-full bg-primary/8 px-2 py-0.5 text-[10px] font-semibold text-primary">
          {modalityLabel}
        </span>
        <span className="max-w-full truncate rounded-full bg-accent/15 px-2 py-0.5 text-[10px] font-semibold text-accent">
          {consultationName}
        </span>
      </div>
    </li>
  );
}

export function AdminDashboardCards({
  data,
  unreadNotifications,
}: {
  data: AdminTodayDashboard;
  unreadNotifications: number;
}) {
  return (
    <div className="grid gap-3 sm:grid-cols-2 sm:gap-4 lg:grid-cols-3">
      <NoteCard title="Calendario" href="/dashboard/admin/calendar">
        <p className="text-sm font-bold text-primary">{data.todayLabel}</p>
        <p className="mt-2 text-xs text-foreground/55">Citas pendientes hoy</p>
        <p className="mt-1 text-3xl font-extrabold tabular-nums text-accent">
          {data.pendingTodayCount}
        </p>
      </NoteCard>

      <LiveNotificationsCard initialCount={unreadNotifications} />

      <div className="sm:col-span-2 lg:col-span-1">
        <NoteCard title="Pacientes" href="/dashboard/admin/patients">
          <div className="flex items-baseline justify-between gap-2">
            <div>
              <p className="text-sm font-bold text-primary">Hoy</p>
              <p className="mt-0.5 text-xs text-foreground/55">
                {data.patientsTodayCount === 1
                  ? "paciente con cita"
                  : "pacientes con cita"}
              </p>
            </div>
            <p className="text-2xl font-extrabold tabular-nums text-accent">
              {data.patientsTodayCount}
            </p>
          </div>

          {data.appointmentsToday.length === 0 ? (
            <p className="mt-3 text-xs text-foreground/45">
              No hay citas programadas para hoy.
            </p>
          ) : (
            <ul className="mt-2 max-h-28 space-y-1.5 overflow-y-auto overscroll-contain pr-0.5 [-webkit-overflow-scrolling:touch]">
              {data.appointmentsToday.map((a) => (
                <AppointmentPreviewItem
                  key={a.id}
                  patientName={a.patientName}
                  time={a.time}
                  modalityLabel={a.modalityLabel}
                  consultationName={a.consultationName}
                />
              ))}
            </ul>
          )}
        </NoteCard>
      </div>
    </div>
  );
}
