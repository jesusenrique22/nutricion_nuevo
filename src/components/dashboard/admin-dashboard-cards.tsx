"use client";

import Link from "next/link";
import { useLiveCounter } from "@/hooks/use-live-counter";
import type { AdminTodayDashboard } from "@/server/actions/dashboard.queries";

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
    <Link
      href={href}
      className="group flex h-full flex-col rounded-2xl border border-foreground/10 bg-white p-4 transition hover:-translate-y-0.5 hover:shadow-md sm:p-5"
    >
      <span className="text-xs font-semibold uppercase tracking-[0.14em] text-foreground/45">
        {title}
      </span>
      <div className="mt-3 flex-1 rounded-xl border border-foreground/8 bg-gradient-to-br from-muted/40 to-white p-4 shadow-inner">
        {children}
      </div>
      <span className="mt-3 text-xs font-semibold text-accent opacity-0 transition group-hover:opacity-100">
        Ver más →
      </span>
    </Link>
  );
}

function LiveNotificationsCard({ initialCount }: { initialCount: number }) {
  const count = useLiveCounter(initialCount, { onNotificationCreated: true });

  return (
    <NoteCard title="Notificaciones" href="/dashboard/notifications">
      <p className="text-sm text-foreground/60">Sin leer</p>
      <p className="mt-2 text-4xl font-extrabold text-primary">{count}</p>
      {count > 0 && (
        <p className="mt-2 text-xs font-semibold text-accent">
          Tienes alertas nuevas
        </p>
      )}
    </NoteCard>
  );
}

export function AdminDashboardCards({
  data,
  unreadNotifications,
}: {
  data: AdminTodayDashboard;
  unreadNotifications: number;
}) {
  const preview = data.appointmentsToday.slice(0, 4);
  const remaining = data.appointmentsToday.length - preview.length;

  return (
    <div className="mt-8 grid gap-4 lg:grid-cols-3">
      <NoteCard title="Calendario" href="/dashboard/admin/calendar">
        <p className="text-sm font-bold text-primary">{data.todayLabel}</p>
        <p className="mt-3 text-xs text-foreground/55">
          Citas pendientes hoy
        </p>
        <p className="mt-1 text-4xl font-extrabold text-accent">
          {data.pendingTodayCount}
        </p>
      </NoteCard>

      <NoteCard title="Pacientes" href="/dashboard/admin/patients">
        <div className="flex items-baseline justify-between gap-2">
          <p className="text-sm font-bold text-primary">Hoy</p>
          <p className="text-2xl font-extrabold text-accent">
            {data.patientsTodayCount}
          </p>
        </div>
        <p className="mt-1 text-xs text-foreground/55">
          {data.patientsTodayCount === 1
            ? "paciente con cita"
            : "pacientes con cita"}
        </p>

        {preview.length === 0 ? (
          <p className="mt-4 text-xs text-foreground/45">
            No hay citas programadas para hoy.
          </p>
        ) : (
          <ul className="mt-3 space-y-2">
            {preview.map((a) => (
              <li
                key={a.id}
                className="rounded-lg border border-foreground/6 bg-white/70 px-2.5 py-2"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="truncate text-xs font-bold">
                    {a.patientName}
                  </span>
                  <span className="shrink-0 text-xs font-semibold text-primary">
                    {a.time}
                  </span>
                </div>
                <div className="mt-1 flex flex-wrap gap-1">
                  <span className="rounded-full bg-primary/8 px-2 py-0.5 text-[10px] font-semibold text-primary">
                    {a.modalityLabel}
                  </span>
                  <span className="rounded-full bg-accent/15 px-2 py-0.5 text-[10px] font-semibold text-accent">
                    {a.consultationName}
                  </span>
                </div>
              </li>
            ))}
            {remaining > 0 && (
              <li className="text-center text-[10px] font-semibold text-foreground/45">
                +{remaining} más hoy
              </li>
            )}
          </ul>
        )}
      </NoteCard>

      <LiveNotificationsCard initialCount={unreadNotifications} />
    </div>
  );
}
