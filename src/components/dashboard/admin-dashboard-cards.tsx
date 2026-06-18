"use client";

import Link from "next/link";
import { useLiveCounter } from "@/hooks/use-live-counter";
import type { AdminTodayDashboard } from "@/server/actions/dashboard.queries";

const CARD_SHELL_CLASS =
  "group flex h-full min-h-0 flex-col rounded-3xl border border-foreground/10 bg-white p-5 transition hover:-translate-y-0.5 hover:shadow-md sm:p-6";

const CARD_BODY_CLASS =
  "mt-4 flex min-h-0 flex-1 flex-col overflow-hidden rounded-2xl border border-foreground/8 bg-gradient-to-br from-muted/40 to-white p-5 shadow-inner sm:p-6";

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
      <span className="shrink-0 text-xs font-semibold uppercase tracking-[0.14em] text-foreground/45 sm:text-sm">
        {title}
      </span>
      <div className={CARD_BODY_CLASS}>{children}</div>
      <span className="mt-4 shrink-0 text-sm font-semibold text-accent opacity-0 transition group-hover:opacity-100">
        Ver más →
      </span>
    </Link>
  );
}

function LiveNotificationsCard({ initialCount }: { initialCount: number }) {
  const count = useLiveCounter(initialCount, { onNotificationEvents: true });

  return (
    <NoteCard title="Notificaciones" href="/dashboard/notifications">
      <p className="text-sm text-foreground/60 sm:text-base">Sin leer</p>
      <p className="mt-3 text-5xl font-extrabold text-primary sm:text-6xl">
        {count}
      </p>
      {count > 0 && (
        <p className="mt-3 text-sm font-semibold text-accent">
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
    <li className="rounded-xl border border-foreground/6 bg-white/70 px-3 py-2.5">
      <div className="flex items-center justify-between gap-3">
        <span className="truncate text-sm font-bold">{patientName}</span>
        <span className="shrink-0 text-sm font-semibold text-primary">{time}</span>
      </div>
      <div className="mt-1 flex min-w-0 flex-wrap gap-1.5">
        <span className="max-w-full truncate rounded-full bg-primary/8 px-2.5 py-0.5 text-[11px] font-semibold text-primary">
          {modalityLabel}
        </span>
        <span className="max-w-full truncate rounded-full bg-accent/15 px-2.5 py-0.5 text-[11px] font-semibold text-accent">
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
    <div className="mt-6 flex min-h-0 flex-1 flex-col gap-5 sm:mt-8 sm:gap-6">
      <div className="flex h-[11rem] flex-col sm:h-[12rem]">
        <NoteCard title="Calendario" href="/dashboard/admin/calendar">
          <p className="text-base font-bold text-primary sm:text-lg">
            {data.todayLabel}
          </p>
          <p className="mt-4 text-sm text-foreground/55">Citas pendientes hoy</p>
          <p className="mt-2 text-5xl font-extrabold text-accent sm:text-6xl">
            {data.pendingTodayCount}
          </p>
        </NoteCard>
      </div>

      <div className="flex min-h-[14rem] flex-1 flex-col sm:min-h-[16rem]">
        <NoteCard title="Pacientes" href="/dashboard/admin/patients">
          <div className="shrink-0">
            <div className="flex items-baseline justify-between gap-3">
              <p className="text-base font-bold text-primary sm:text-lg">Hoy</p>
              <p className="text-3xl font-extrabold text-accent sm:text-4xl">
                {data.patientsTodayCount}
              </p>
            </div>
            <p className="mt-1 text-sm text-foreground/55">
              {data.patientsTodayCount === 1
                ? "paciente con cita"
                : "pacientes con cita"}
            </p>
          </div>

          {data.appointmentsToday.length === 0 ? (
            <p className="mt-6 text-sm text-foreground/45">
              No hay citas programadas para hoy.
            </p>
          ) : (
            <ul className="mt-4 min-h-0 flex-1 space-y-2 overflow-y-auto overscroll-contain pr-1 [-webkit-overflow-scrolling:touch]">
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

      <div className="flex h-[11rem] flex-col sm:h-[12rem]">
        <LiveNotificationsCard initialCount={unreadNotifications} />
      </div>
    </div>
  );
}
