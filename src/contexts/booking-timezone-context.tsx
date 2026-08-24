"use client";

import {
  createContext,
  useCallback,
  useContext,
  useLayoutEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { CLINIC_TIMEZONE } from "@/lib/clinic-timezone";
import {
  BOOKING_TIMEZONE_MANUAL_KEY,
  BOOKING_TIMEZONE_STORAGE_KEY,
  buildTimezoneSelectGroups,
  clinicTimezoneLabel,
  detectBrowserTimezone,
  formatDateTimeInZone,
  formatTimeInZone,
  isValidTimezone,
  timezoneShortLabel,
  viewerDiffersFromClinic,
  type TimezoneOptionGroup,
} from "@/lib/timezone/display";

type BookingTimezoneContextValue = {
  clinicTimezone: string;
  viewerTimezone: string;
  isAutoDetected: boolean;
  setViewerTimezone: (tz: string) => void;
  resetToDetectedTimezone: () => void;
  showsClinicReference: boolean;
  clinicTimezoneName: string;
  viewerTimezoneShort: string;
  formatSlotTime: (iso: string) => string;
  formatClinicSlotTime: (iso: string) => string;
  formatAppointmentDateTime: (iso: string) => string;
  timezoneGroups: TimezoneOptionGroup[];
};

const BookingTimezoneContext =
  createContext<BookingTimezoneContextValue | null>(null);

function readManualTimezone(): string | null {
  if (typeof window === "undefined") return null;

  try {
    const manual = localStorage.getItem(BOOKING_TIMEZONE_MANUAL_KEY)?.trim();
    if (manual && isValidTimezone(manual)) return manual;

    // Migrar elección manual guardada con la clave anterior.
    const legacy = localStorage.getItem(BOOKING_TIMEZONE_STORAGE_KEY)?.trim();
    if (legacy && isValidTimezone(legacy)) {
      localStorage.setItem(BOOKING_TIMEZONE_MANUAL_KEY, legacy);
      localStorage.removeItem(BOOKING_TIMEZONE_STORAGE_KEY);
      return legacy;
    }
  } catch {
    /* private mode */
  }

  return null;
}

function resolveInitialTimezone(): string {
  if (typeof window === "undefined") return CLINIC_TIMEZONE;
  return readManualTimezone() ?? detectBrowserTimezone();
}

export function BookingTimezoneProvider({ children }: { children: ReactNode }) {
  const [viewerTimezone, setViewerTimezoneState] = useState(resolveInitialTimezone);
  const [isAutoDetected, setIsAutoDetected] = useState(
    () => typeof window !== "undefined" && readManualTimezone() === null,
  );
  const [hydrated, setHydrated] = useState(() => typeof window !== "undefined");

  useLayoutEffect(() => {
    const manual = readManualTimezone();
    const detected = detectBrowserTimezone();
    setViewerTimezoneState(manual ?? detected);
    setIsAutoDetected(manual === null);
    setHydrated(true);
  }, []);

  const setViewerTimezone = useCallback((tz: string) => {
    if (!isValidTimezone(tz)) return;
    setViewerTimezoneState(tz);
    setIsAutoDetected(false);
    try {
      localStorage.setItem(BOOKING_TIMEZONE_MANUAL_KEY, tz);
    } catch {
      /* private mode */
    }
  }, []);

  const resetToDetectedTimezone = useCallback(() => {
    const detected = detectBrowserTimezone();
    setViewerTimezoneState(detected);
    setIsAutoDetected(true);
    try {
      localStorage.removeItem(BOOKING_TIMEZONE_MANUAL_KEY);
      localStorage.removeItem(BOOKING_TIMEZONE_STORAGE_KEY);
    } catch {
      /* private mode */
    }
  }, []);

  const showsClinicReference = useMemo(
    () => hydrated && viewerDiffersFromClinic(viewerTimezone),
    [hydrated, viewerTimezone],
  );

  const formatSlotTime = useCallback(
    (iso: string) => formatTimeInZone(iso, viewerTimezone),
    [viewerTimezone],
  );

  const formatClinicSlotTime = useCallback(
    (iso: string) => formatTimeInZone(iso, CLINIC_TIMEZONE),
    [],
  );

  const formatAppointmentDateTime = useCallback(
    (iso: string) => formatDateTimeInZone(iso, viewerTimezone),
    [viewerTimezone],
  );

  const timezoneGroups = useMemo(
    () => buildTimezoneSelectGroups(viewerTimezone, hydrated),
    [viewerTimezone, hydrated],
  );

  const ctxValue = useMemo(
    (): BookingTimezoneContextValue => ({
      clinicTimezone: CLINIC_TIMEZONE,
      viewerTimezone,
      isAutoDetected,
      setViewerTimezone,
      resetToDetectedTimezone,
      showsClinicReference,
      clinicTimezoneName: clinicTimezoneLabel(),
      viewerTimezoneShort: timezoneShortLabel(viewerTimezone),
      formatSlotTime,
      formatClinicSlotTime,
      formatAppointmentDateTime,
      timezoneGroups,
    }),
    [
      viewerTimezone,
      isAutoDetected,
      setViewerTimezone,
      resetToDetectedTimezone,
      showsClinicReference,
      formatSlotTime,
      formatClinicSlotTime,
      formatAppointmentDateTime,
      timezoneGroups,
    ],
  );

  return (
    <BookingTimezoneContext.Provider value={ctxValue}>
      {children}
    </BookingTimezoneContext.Provider>
  );
}

export function useBookingTimezone(): BookingTimezoneContextValue {
  const ctx = useContext(BookingTimezoneContext);
  if (!ctx) {
    throw new Error(
      "useBookingTimezone debe usarse dentro de BookingTimezoneProvider.",
    );
  }
  return ctx;
}
