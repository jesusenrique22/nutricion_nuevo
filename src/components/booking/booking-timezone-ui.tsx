"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import { useBookingTimezone } from "@/contexts/booking-timezone-context";
import {
  timezoneDisplayLabel,
  timezoneShortLabel,
  type TimezoneOptionGroup,
} from "@/lib/timezone/display";

function ChevronIcon({ open }: { open: boolean }) {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      className={`shrink-0 transition-transform ${open ? "rotate-180" : ""}`}
      aria-hidden
    >
      <path d="M6 9l6 6 6-6" />
    </svg>
  );
}

function GlobeIcon() {
  return (
    <svg
      width="15"
      height="15"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      className="shrink-0 text-primary/70"
      aria-hidden
    >
      <circle cx="12" cy="12" r="10" />
      <path d="M2 12h20M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
    </svg>
  );
}

function shortSelectedLabel(
  tz: string,
  groups: TimezoneOptionGroup[],
): string {
  for (const group of groups) {
    const opt = group.options.find((o) => o.value === tz);
    if (opt) {
      const base = opt.label.split(" (")[0]?.trim() ?? opt.label;
      return base.length > 32 ? `${base.slice(0, 29)}…` : base;
    }
  }
  const full = timezoneDisplayLabel(tz);
  return full.length > 32 ? `${full.slice(0, 29)}…` : full;
}

function filterGroups(
  groups: TimezoneOptionGroup[],
  query: string,
): TimezoneOptionGroup[] {
  const q = query.trim().toLowerCase();
  if (!q) return groups;

  return groups
    .map((group) => ({
      ...group,
      options: group.options.filter(
        (opt) =>
          opt.label.toLowerCase().includes(q) ||
          opt.value.toLowerCase().includes(q) ||
          group.region.toLowerCase().includes(q),
      ),
    }))
    .filter((group) => group.options.length > 0);
}

export function BookingTimezoneSelector({ compact = false }: { compact?: boolean }) {
  const {
    viewerTimezone,
    setViewerTimezone,
    resetToDetectedTimezone,
    isAutoDetected,
    showsClinicReference,
    clinicTimezoneName,
    viewerTimezoneShort,
    timezoneGroups,
  } = useBookingTimezone();

  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const rootRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listId = useId();

  const selectedLabel = shortSelectedLabel(viewerTimezone, timezoneGroups);
  const filtered = useMemo(
    () => filterGroups(timezoneGroups, query),
    [timezoneGroups, query],
  );

  useEffect(() => {
    if (!open) return;
    const t = window.setTimeout(() => inputRef.current?.focus(), 0);
    function onPointerDown(e: MouseEvent | TouchEvent) {
      const el = rootRef.current;
      if (!el?.contains(e.target as Node)) setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("touchstart", onPointerDown);
    document.addEventListener("keydown", onKey);
    return () => {
      window.clearTimeout(t);
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("touchstart", onPointerDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  function pick(value: string) {
    setViewerTimezone(value);
    setOpen(false);
    setQuery("");
  }

  return (
    <div
      ref={rootRef}
      className={
        compact
          ? "relative"
          : "relative rounded-2xl border border-foreground/10 bg-muted/25 px-3 py-2.5"
      }
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-foreground/45">
            Tu zona horaria
          </p>
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            aria-expanded={open}
            aria-controls={listId}
            className="mt-1.5 flex w-full items-center gap-2 rounded-xl border border-foreground/12 bg-white px-3 py-2 text-left shadow-sm transition hover:border-primary/35 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/15"
          >
            <GlobeIcon />
            <span className="min-w-0 flex-1 truncate text-sm font-semibold text-foreground">
              {selectedLabel}
            </span>
            <span className="shrink-0 rounded-full bg-muted px-2 py-0.5 text-[10px] font-bold text-foreground/55">
              {viewerTimezoneShort}
            </span>
            <ChevronIcon open={open} />
          </button>
        </div>
      </div>

      {!open && (
        <p className="mt-1.5 text-[10px] leading-snug text-foreground/45">
          {isAutoDetected
            ? showsClinicReference
              ? `Detectada automáticamente · horarios en ${viewerTimezoneShort} · clínica en ${clinicTimezoneName}`
              : "Detectada automáticamente · misma zona que la clínica"
            : showsClinicReference
              ? `Horarios en ${viewerTimezoneShort} · clínica en ${clinicTimezoneName}`
              : "Zona elegida manualmente · misma hora que la clínica"}
        </p>
      )}

      {open && (
        <div
          id={listId}
          className="absolute left-0 right-0 z-40 mt-2 overflow-hidden rounded-2xl border border-foreground/12 bg-white shadow-xl ring-1 ring-black/5"
        >
          <div className="border-b border-foreground/8 p-2 space-y-2">
            <button
              type="button"
              onClick={() => {
                resetToDetectedTimezone();
                setOpen(false);
                setQuery("");
              }}
              className="flex w-full items-center justify-center gap-1.5 rounded-xl border border-primary/20 bg-primary/5 px-3 py-2 text-xs font-semibold text-primary transition hover:bg-primary/10"
            >
              <GlobeIcon />
              Usar mi ubicación actual
            </button>
            <input
              ref={inputRef}
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Buscar país o ciudad…"
              className="w-full rounded-xl border border-foreground/12 bg-muted/30 px-3 py-2 text-sm outline-none placeholder:text-foreground/40 focus:border-primary focus:ring-2 focus:ring-primary/10"
            />
          </div>

          <ul
            className="max-h-52 overflow-y-auto overscroll-contain py-1"
            role="listbox"
            aria-label="Zonas horarias"
          >
            {filtered.length === 0 ? (
              <li className="px-3 py-4 text-center text-xs text-foreground/50">
                Sin resultados. Tu zona detectada sigue activa.
              </li>
            ) : (
              filtered.map((group) => (
                <li key={group.region}>
                  <p className="sticky top-0 bg-white/95 px-3 py-1.5 text-[10px] font-bold uppercase tracking-wide text-foreground/40 backdrop-blur-sm">
                    {group.region}
                  </p>
                  <ul>
                    {group.options.map((opt) => {
                      const active = opt.value === viewerTimezone;
                      return (
                        <li key={opt.value}>
                          <button
                            type="button"
                            role="option"
                            aria-selected={active}
                            onClick={() => pick(opt.value)}
                            className={`flex w-full items-center gap-2 px-3 py-2 text-left text-sm transition ${
                              active
                                ? "bg-primary/10 font-semibold text-primary"
                                : "text-foreground/85 hover:bg-muted/60"
                            }`}
                          >
                            <span className="min-w-0 flex-1 truncate">
                              {opt.label}
                            </span>
                            <span className="shrink-0 text-[10px] font-medium text-foreground/45">
                              {timezoneShortLabel(opt.value)}
                            </span>
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                </li>
              ))
            )}
          </ul>
        </div>
      )}
    </div>
  );
}

export function SlotTimeLabel({ iso }: { iso: string }) {
  const { formatSlotTime, formatClinicSlotTime, showsClinicReference } =
    useBookingTimezone();

  if (!showsClinicReference) {
    return <>{formatSlotTime(iso)}</>;
  }

  return (
    <span className="flex flex-col items-center leading-tight">
      <span>{formatSlotTime(iso)}</span>
      <span className="mt-0.5 text-[10px] font-normal opacity-80">
        {formatClinicSlotTime(iso)} AR
      </span>
    </span>
  );
}
