"use client";

import Link from "next/link";
import { useId, useState } from "react";
import { DisplayPrice } from "@/components/currency/display-price";
import {
  appointmentStatusLabels,
  cancelledByLabels,
  modalityLabels,
} from "@/lib/appointment-labels";
import type {
  AnalyticsAppointmentRow,
  AnalyticsPendingPaymentRow,
} from "@/server/actions/analytics.queries";

type Accent = "primary" | "accent" | "warning" | "danger";

const GLOWS: Record<Accent, string> = {
  primary: "from-primary/15 to-primary/5",
  accent: "from-accent/40 to-accent/10",
  warning: "from-amber-200/60 to-amber-100/20",
  danger: "from-red-200/60 to-red-100/20",
};

function formatWhen(iso: string) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString("es", {
    weekday: "short",
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "America/Argentina/Buenos_Aires",
  });
}

function Chevron({ open }: { open: boolean }) {
  return (
    <svg
      viewBox="0 0 16 16"
      aria-hidden
      className={`h-3.5 w-3.5 transition-transform ${open ? "rotate-180" : ""}`}
    >
      <path
        d="M4 6l4 4 4-4"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/**
 * KPI que se despliega con el detalle detrás del número.
 *
 * Un total suelto no dice a quién llamar: al abrirlo se ve la lista concreta de
 * pacientes, fechas e importes, cada uno con acceso directo a su ficha.
 */
export function AnalyticsDetailCard({
  label,
  value,
  hint,
  accent = "primary",
  emptyLabel,
  children,
}: {
  label: string;
  value: number | string;
  hint?: string;
  accent?: Accent;
  emptyLabel: string;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const panelId = useId();
  const count = typeof value === "number" ? value : Number(value);
  const hasDetail = Number.isFinite(count) ? count > 0 : true;

  return (
    <div className="group relative overflow-hidden rounded-2xl border border-foreground/8 bg-white shadow-sm transition hover:shadow-md">
      <div
        className={`pointer-events-none absolute -right-6 -top-6 h-24 w-24 rounded-full bg-gradient-to-br opacity-80 blur-2xl ${GLOWS[accent]}`}
      />
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-controls={panelId}
        className="relative w-full cursor-pointer p-5 text-left"
      >
        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-foreground/45">
          {label}
        </p>
        <p className="mt-2 text-4xl font-extrabold tabular-nums tracking-tight">
          {value}
        </p>
        <div className="mt-2 flex items-end justify-between gap-3">
          {hint ? (
            <p className="text-xs text-foreground/50">{hint}</p>
          ) : (
            <span />
          )}
          <span className="inline-flex shrink-0 items-center gap-1 text-xs font-bold text-primary">
            {open ? "Ocultar" : "Ver detalle"}
            <Chevron open={open} />
          </span>
        </div>
      </button>

      {open && (
        <div
          id={panelId}
          className="relative border-t border-foreground/8 bg-foreground/[0.02] px-3 py-3"
        >
          {hasDetail ? (
            <ul className="max-h-80 space-y-2 overflow-y-auto pr-1">
              {children}
            </ul>
          ) : (
            <p className="px-2 py-4 text-center text-sm text-foreground/50">
              {emptyLabel}
            </p>
          )}
        </div>
      )}
    </div>
  );
}

function RowShell({
  href,
  children,
}: {
  href: string;
  children: React.ReactNode;
}) {
  return (
    <li>
      <Link
        href={href}
        className="block rounded-xl bg-white px-3 py-2.5 ring-1 ring-foreground/6 transition hover:ring-primary/25"
      >
        {children}
      </Link>
    </li>
  );
}

export function UpcomingAppointmentRow({
  row,
}: {
  row: AnalyticsAppointmentRow;
}) {
  return (
    <RowShell href={`/dashboard/admin/calendar?appointmentId=${row.id}`}>
      <div className="flex items-baseline justify-between gap-3">
        <span className="truncate text-sm font-semibold">
          {row.patientName}
        </span>
        <span className="shrink-0 text-xs font-bold tabular-nums text-primary">
          {formatWhen(row.startTime)}
        </span>
      </div>
      <p className="mt-0.5 truncate text-xs text-foreground/55">
        {row.consultationName} · {modalityLabels[row.modality] ?? row.modality}{" "}
        · {appointmentStatusLabels[row.status] ?? row.status}
      </p>
    </RowShell>
  );
}

export function CancelledAppointmentRow({
  row,
}: {
  row: AnalyticsAppointmentRow;
}) {
  return (
    <RowShell href={`/dashboard/admin/patients/${row.patientId}`}>
      <div className="flex items-baseline justify-between gap-3">
        <span className="truncate text-sm font-semibold">
          {row.patientName}
        </span>
        <span className="shrink-0 text-xs font-bold tabular-nums text-red-700">
          {formatWhen(row.startTime)}
        </span>
      </div>
      <p className="mt-0.5 truncate text-xs text-foreground/55">
        {row.consultationName}
        {row.cancelledBy
          ? ` · ${cancelledByLabels[row.cancelledBy] ?? row.cancelledBy}`
          : ""}
        {row.cancelledAt ? ` · ${formatWhen(row.cancelledAt)}` : ""}
      </p>
    </RowShell>
  );
}

const PHASE_LABELS: Record<AnalyticsPendingPaymentRow["phase"], string> = {
  FULL: "Total pendiente",
  ADVANCE: "Falta la seña",
  REMAINDER: "Falta el saldo",
};

export function PendingPaymentRow({
  row,
}: {
  row: AnalyticsPendingPaymentRow;
}) {
  return (
    <RowShell href={`/dashboard/admin/payments?appointmentId=${row.appointmentId}`}>
      <div className="flex items-baseline justify-between gap-3">
        <span className="truncate text-sm font-semibold">
          {row.patientName}
        </span>
        <span className="shrink-0 text-xs font-bold tabular-nums text-amber-800">
          <DisplayPrice
            amount={row.pendingAmount}
            currency={row.currency === "USD" ? "USD" : "ARS"}
          />
        </span>
      </div>
      <p className="mt-0.5 truncate text-xs text-foreground/55">
        {PHASE_LABELS[row.phase]} · {row.consultationName} ·{" "}
        {formatWhen(row.startTime)}
      </p>
    </RowShell>
  );
}
