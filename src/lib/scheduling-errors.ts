/** Conflicto de horario al agendar (aplicación o constraint PostgreSQL). */
export class TimeSlotTakenError extends Error {
  readonly code = "TIME_SLOT_TAKEN" as const;

  constructor(message = "Ese bloque horario ya está ocupado.") {
    super(message);
    this.name = "TimeSlotTakenError";
  }
}

export function isTimeSlotConflictError(error: unknown): boolean {
  if (error instanceof TimeSlotTakenError) return true;
  const msg = error instanceof Error ? error.message : String(error);
  return (
    msg.includes("23P01") ||
    msg.includes("Appointment_no_overlap_active") ||
    msg.includes("exclusion constraint")
  );
}

export const TIME_SLOT_TAKEN_MESSAGE = "Ese bloque horario ya está ocupado.";
