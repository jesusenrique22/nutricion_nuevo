"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { clinicDateTimeToUtc } from "@/lib/clinic-timezone";
import { formatActionError } from "@/lib/db-errors";
import {
  deleteInternalEventSchema,
  markInternalEventChargeSchema,
  upsertInternalEventSchema,
} from "@/lib/validators/internal-event";
import { isPrismaInternalEventReady, prisma } from "@/server/db/prisma";
import {
  findOverlappingAppointment,
  findOverlappingBlock,
  findOverlappingInternalEvent,
} from "@/server/services/scheduling.service";
import type { InternalEventNotifyInput } from "@/server/services/internal-event-notify.service";

export interface InternalEventDTO {
  id: string;
  title: string;
  description: string | null;
  kind: string;
  start: string;
  end: string;
  modality: string;
  location: string | null;
  attendeeName: string | null;
  attendeeEmail: string | null;
  patientId: string | null;
  isGuest: boolean;
  chargeAmount: string | null;
  chargeCurrency: string;
  chargePaid: boolean;
  notifiedAt: string | null;
  googleSynced: boolean;
}

export type InternalEventResult =
  | { ok: true; id: string }
  | { ok: false; message: string };

const NOT_READY_MESSAGE =
  "La agenda de eventos todavía no está disponible. Recargá la página e intentá de nuevo.";

async function requireAdmin() {
  const session = await auth();
  if (session?.user?.role !== "ADMIN" || !session.user.id) return null;
  return session;
}

function revalidateEventPaths(patientId?: string | null) {
  revalidatePath("/dashboard/admin/calendar");
  revalidatePath("/dashboard/admin/analytics");
  revalidatePath("/dashboard/patient/appointments");
  if (patientId) revalidatePath(`/dashboard/admin/patients/${patientId}`);
}

type EventWithPatient = {
  id: string;
  title: string;
  description: string | null;
  kind: string;
  startTime: Date;
  endTime: Date;
  modality: string;
  location: string | null;
  guestName: string | null;
  guestEmail: string | null;
  patientId: string | null;
  chargeAmount: { toString(): string } | null;
  chargeCurrency: string;
  chargePaid: boolean;
  notifiedAt: Date | null;
  googleEventId: string | null;
  patient: { id: string; name: string; email: string } | null;
};

function toDTO(event: EventWithPatient): InternalEventDTO {
  return {
    id: event.id,
    title: event.title,
    description: event.description,
    kind: event.kind,
    start: event.startTime.toISOString(),
    end: event.endTime.toISOString(),
    modality: event.modality,
    location: event.location,
    attendeeName: event.patient?.name ?? event.guestName ?? null,
    attendeeEmail: event.patient?.email ?? event.guestEmail ?? null,
    patientId: event.patientId,
    isGuest: !event.patientId && Boolean(event.guestEmail),
    chargeAmount: event.chargeAmount?.toString() ?? null,
    chargeCurrency: event.chargeCurrency,
    chargePaid: event.chargePaid,
    notifiedAt: event.notifiedAt?.toISOString() ?? null,
    googleSynced: Boolean(event.googleEventId),
  };
}

function toNotifyInput(event: EventWithPatient): InternalEventNotifyInput | null {
  const email = event.patient?.email ?? event.guestEmail;
  if (!email) return null;

  return {
    id: event.id,
    title: event.title,
    description: event.description,
    kind: event.kind,
    startTime: event.startTime,
    endTime: event.endTime,
    modality: event.modality,
    location: event.location,
    chargeAmount: event.chargeAmount?.toString() ?? null,
    chargeCurrency: event.chargeCurrency,
    target: {
      patientId: event.patientId,
      name: event.patient?.name ?? event.guestName ?? "",
      email,
    },
  };
}

/** Eventos de agenda desde hoy en adelante (solo ADMIN). */
export async function getInternalEvents(): Promise<InternalEventDTO[]> {
  if (!(await requireAdmin())) return [];
  if (!isPrismaInternalEventReady()) return [];

  // Un margen hacia atrás mantiene visible lo de esta semana en el calendario.
  const from = new Date();
  from.setDate(from.getDate() - 30);

  const events = await prisma.internalEvent.findMany({
    where: { cancelledAt: null, endTime: { gte: from } },
    include: { patient: { select: { id: true, name: true, email: true } } },
    orderBy: { startTime: "asc" },
  });

  return events.map(toDTO);
}

/** Encuentros agendados por Anttova para el paciente autenticado. */
export async function getMyInternalEvents(): Promise<InternalEventDTO[]> {
  const session = await auth();
  if (!session?.user?.id) return [];
  if (!isPrismaInternalEventReady()) return [];

  try {
    const events = await prisma.internalEvent.findMany({
      where: {
        patientId: session.user.id,
        cancelledAt: null,
        endTime: { gte: new Date() },
      },
      include: { patient: { select: { id: true, name: true, email: true } } },
      orderBy: { startTime: "asc" },
    });
    return events.map(toDTO);
  } catch (err) {
    console.error("[getMyInternalEvents]", err);
    return [];
  }
}

export async function upsertInternalEvent(
  input: unknown,
): Promise<InternalEventResult> {
  const session = await requireAdmin();
  if (!session) return { ok: false, message: "No autorizado." };
  if (!isPrismaInternalEventReady()) {
    return { ok: false, message: NOT_READY_MESSAGE };
  }

  const parsed = upsertInternalEventSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      message: parsed.error.issues[0]?.message ?? "Datos inválidos.",
    };
  }

  const data = parsed.data;
  const startTime = clinicDateTimeToUtc(data.dateStr, data.startTime);
  if (Number.isNaN(startTime.getTime())) {
    return { ok: false, message: "Fecha u hora inválida." };
  }
  const endTime = new Date(
    startTime.getTime() + data.durationMinutes * 60_000,
  );

  const [appointmentClash, blockClash, eventClash] = await Promise.all([
    findOverlappingAppointment(prisma, { startTime, endTime }),
    findOverlappingBlock(prisma, { startTime, endTime }),
    findOverlappingInternalEvent(prisma, {
      startTime,
      endTime,
      excludeInternalEventId: data.id,
    }),
  ]);

  if (appointmentClash) {
    return {
      ok: false,
      message: "Ese horario ya tiene una cita de paciente agendada.",
    };
  }
  if (blockClash) {
    return {
      ok: false,
      message: "Ese horario está bloqueado en tu agenda. Quitá el bloqueo o elegí otro.",
    };
  }
  if (eventClash) {
    return {
      ok: false,
      message: `Se superpone con «${eventClash.title}». Elegí otro horario.`,
    };
  }

  const isPatient = data.attendeeType === "PATIENT";
  const isGuest = data.attendeeType === "GUEST";

  if (isPatient) {
    const patient = await prisma.user.findFirst({
      where: { id: data.patientId, role: "PATIENT" },
      select: { id: true },
    });
    if (!patient) return { ok: false, message: "Paciente no encontrado." };
  }

  const chargeAmount =
    data.chargeAmount && data.chargeAmount > 0 ? data.chargeAmount : null;

  // Si se quita el arancel, el evento no puede quedar marcado como cobrado.
  const chargePaidReset = chargeAmount === null ? { chargePaid: false } : {};

  const previous = data.id
    ? await prisma.internalEvent.findUnique({
        where: { id: data.id },
        select: { startTime: true, endTime: true },
      })
    : null;

  const payload = {
    title: data.title,
    description: data.description?.trim() || null,
    kind: data.kind,
    startTime,
    endTime,
    modality: data.modality,
    location: data.location?.trim() || null,
    patientId: isPatient ? (data.patientId ?? null) : null,
    guestName: isGuest ? data.guestName?.trim() || null : null,
    guestEmail: isGuest ? data.guestEmail?.trim() || null : null,
    chargeAmount,
    chargeCurrency: data.chargeCurrency?.trim() || "ARS",
    ...chargePaidReset,
  };

  let event: EventWithPatient;
  try {
    event = data.id
      ? await prisma.internalEvent.update({
          where: { id: data.id },
          data: payload,
          include: {
            patient: { select: { id: true, name: true, email: true } },
          },
        })
      : await prisma.internalEvent.create({
          data: { ...payload, createdById: session.user.id },
          include: {
            patient: { select: { id: true, name: true, email: true } },
          },
        });
  } catch (err) {
    console.error("[upsertInternalEvent]", err);
    return {
      ok: false,
      message: formatActionError(err, "No se pudo guardar el evento."),
    };
  }

  // El aviso y el calendario nunca deben tumbar el guardado del evento.
  if (data.notifyAttendee !== false) {
    const notifyInput = toNotifyInput(event);
    if (notifyInput) {
      const { notifyInternalEventScheduled } = await import(
        "@/server/services/internal-event-notify.service"
      );
      // "Reprogramado" solo si cambió el horario: editar el título o una nota
      // no justifica decirle al participante que le movimos la fecha.
      const movedInTime =
        previous !== null &&
        (previous.startTime.getTime() !== startTime.getTime() ||
          previous.endTime.getTime() !== endTime.getTime());

      await notifyInternalEventScheduled(notifyInput, {
        rescheduled: movedInTime,
      });
      await prisma.internalEvent
        .update({
          where: { id: event.id },
          data: { notifiedAt: new Date() },
        })
        .catch(() => {});
    }
  }

  try {
    const { syncInternalEventToGoogleCalendar } = await import(
      "@/server/services/internal-event-calendar.service"
    );
    await syncInternalEventToGoogleCalendar(event.id);
  } catch (err) {
    console.error("[upsertInternalEvent/calendar]", err);
  }

  revalidateEventPaths(event.patientId);
  return { ok: true, id: event.id };
}

/** Reenvía la invitación sin tocar la fecha (p. ej. si el correo se perdió). */
export async function resendInternalEventInvite(
  id: string,
): Promise<InternalEventResult> {
  if (!(await requireAdmin())) return { ok: false, message: "No autorizado." };
  if (!isPrismaInternalEventReady()) {
    return { ok: false, message: NOT_READY_MESSAGE };
  }

  const event = await prisma.internalEvent.findUnique({
    where: { id },
    include: { patient: { select: { id: true, name: true, email: true } } },
  });
  if (!event || event.cancelledAt) {
    return { ok: false, message: "Evento no encontrado." };
  }

  const notifyInput = toNotifyInput(event);
  if (!notifyInput) {
    return {
      ok: false,
      message: "Este evento no tiene participante a quien avisarle.",
    };
  }

  const { notifyInternalEventScheduled } = await import(
    "@/server/services/internal-event-notify.service"
  );
  await notifyInternalEventScheduled(notifyInput);
  await prisma.internalEvent
    .update({ where: { id }, data: { notifiedAt: new Date() } })
    .catch(() => {});

  revalidateEventPaths(event.patientId);
  return { ok: true, id };
}

export async function deleteInternalEvent(
  input: unknown,
): Promise<InternalEventResult> {
  if (!(await requireAdmin())) return { ok: false, message: "No autorizado." };
  if (!isPrismaInternalEventReady()) {
    return { ok: false, message: NOT_READY_MESSAGE };
  }

  const parsed = deleteInternalEventSchema.safeParse(input);
  if (!parsed.success) return { ok: false, message: "Datos inválidos." };

  const event = await prisma.internalEvent.findUnique({
    where: { id: parsed.data.id },
    include: { patient: { select: { id: true, name: true, email: true } } },
  });
  if (!event) return { ok: false, message: "Evento no encontrado." };

  if (parsed.data.notify !== false) {
    const notifyInput = toNotifyInput(event);
    if (notifyInput) {
      const { notifyInternalEventCancelled } = await import(
        "@/server/services/internal-event-notify.service"
      );
      await notifyInternalEventCancelled(notifyInput);
    }
  }

  try {
    const { removeInternalEventFromGoogleCalendar } = await import(
      "@/server/services/internal-event-calendar.service"
    );
    await removeInternalEventFromGoogleCalendar(event.id);
  } catch (err) {
    console.error("[deleteInternalEvent/calendar]", err);
  }

  try {
    await prisma.internalEvent.delete({ where: { id: event.id } });
  } catch (err) {
    console.error("[deleteInternalEvent]", err);
    return {
      ok: false,
      message: formatActionError(err, "No se pudo eliminar el evento."),
    };
  }

  revalidateEventPaths(event.patientId);
  return { ok: true, id: event.id };
}

export async function markInternalEventCharge(
  input: unknown,
): Promise<InternalEventResult> {
  if (!(await requireAdmin())) return { ok: false, message: "No autorizado." };
  if (!isPrismaInternalEventReady()) {
    return { ok: false, message: NOT_READY_MESSAGE };
  }

  const parsed = markInternalEventChargeSchema.safeParse(input);
  if (!parsed.success) return { ok: false, message: "Datos inválidos." };

  try {
    const event = await prisma.internalEvent.update({
      where: { id: parsed.data.id },
      data: { chargePaid: parsed.data.paid },
      select: { id: true, patientId: true },
    });
    revalidateEventPaths(event.patientId);
    return { ok: true, id: event.id };
  } catch (err) {
    console.error("[markInternalEventCharge]", err);
    return {
      ok: false,
      message: formatActionError(err, "No se pudo actualizar el cobro."),
    };
  }
}
