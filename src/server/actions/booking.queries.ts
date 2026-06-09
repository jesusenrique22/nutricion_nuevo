"use server";

import { auth } from "@/lib/auth";
import { prisma } from "@/server/db/prisma";
import { getAvailableSlots, type Slot } from "@/server/services/availability.service";

export interface ConsultationTypeDTO {
  id: string;
  code: string;
  name: string;
  description: string | null;
  durationMinutes: number;
  price: string;
  allowsOnline: boolean;
  allowsPresencial: boolean;
  morningOnly: boolean;
  morningStart: string | null;
  morningEnd: string | null;
}

export async function getConsultationTypes(): Promise<ConsultationTypeDTO[]> {
  const types = await prisma.consultationType.findMany({
    orderBy: { code: "asc" },
  });
  return types.map((t) => ({
    id: t.id,
    code: t.code,
    name: t.name,
    description: t.description,
    durationMinutes: t.durationMinutes,
    price: t.price.toString(),
    allowsOnline: t.allowsOnline,
    allowsPresencial: t.allowsPresencial,
    morningOnly: t.morningOnly,
    morningStart: t.morningStart,
    morningEnd: t.morningEnd,
  }));
}

export async function getSlotsForDay(
  consultationTypeId: string,
  dateStr: string,
): Promise<Slot[]> {
  const type = await prisma.consultationType.findUnique({
    where: { id: consultationTypeId },
  });
  if (!type) return [];
  return getAvailableSlots(type, dateStr);
}

export interface AppointmentDTO {
  id: string;
  start: string;
  end: string;
  title: string;
  status: string;
  modality: string;
  flow: string;
  patientName?: string;
  patientId?: string;
  consultationCode?: string;
  consultationName?: string;
  price?: string;
  paymentStatus?: string | null;
  notes?: string | null;
}

/** Citas del paciente autenticado. */
export async function getMyAppointments(): Promise<AppointmentDTO[]> {
  const session = await auth();
  if (!session?.user?.id) return [];

  const appts = await prisma.appointment.findMany({
    where: { patientId: session.user.id },
    include: { consultationType: true, payment: true },
    orderBy: { startTime: "desc" },
  });

  return appts.map((a) => ({
    id: a.id,
    start: a.startTime.toISOString(),
    end: a.endTime.toISOString(),
    title: a.consultationType.name,
    status: a.status,
    modality: a.modality,
    flow: a.flow,
    consultationCode: a.consultationType.code,
    consultationName: a.consultationType.name,
    price: a.consultationType.price.toString(),
    paymentStatus: a.payment?.status ?? null,
    notes: a.notes,
  }));
}

/** Todas las citas (solo ADMIN) — para el calendario de la doctora. */
export async function getAllAppointments(): Promise<AppointmentDTO[]> {
  const session = await auth();
  if (session?.user?.role !== "ADMIN") return [];

  const appts = await prisma.appointment.findMany({
    include: { consultationType: true, patient: true, payment: true },
    orderBy: { startTime: "asc" },
  });

  return appts.map((a) => ({
    id: a.id,
    start: a.startTime.toISOString(),
    end: a.endTime.toISOString(),
    title: `${a.consultationType.code} · ${a.patient.name}`,
    status: a.status,
    modality: a.modality,
    flow: a.flow,
    patientName: a.patient.name,
    patientId: a.patientId,
    consultationCode: a.consultationType.code,
    consultationName: a.consultationType.name,
    price: a.consultationType.price.toString(),
    paymentStatus: a.payment?.status ?? null,
    notes: a.notes,
  }));
}
