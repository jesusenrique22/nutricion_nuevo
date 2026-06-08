"use server";

import { auth } from "@/lib/auth";
import { prisma } from "@/server/db/prisma";

export interface AppointmentFormContext {
  appointmentId: string;
  flow: "INTAKE" | "FOLLOW_UP";
  consultationName: string;
  startTime: string;
  isCompleted: boolean;
}

/** Contexto para renderizar Intake vs Follow-up en la página de formulario. */
export async function getAppointmentFormContext(
  appointmentId: string,
): Promise<AppointmentFormContext | null> {
  const session = await auth();
  if (!session?.user?.id) return null;

  const appointment = await prisma.appointment.findFirst({
    where: { id: appointmentId, patientId: session.user.id },
    include: {
      consultationType: true,
      patient: { include: { patientProfile: true } },
      followUpSubmission: true,
    },
  });

  if (!appointment) return null;
  if (!["PENDING", "CONFIRMED"].includes(appointment.status)) return null;

  const isCompleted =
    appointment.flow === "INTAKE"
      ? (appointment.patient.patientProfile?.hasCompletedIntake ?? false)
      : Boolean(appointment.followUpSubmission);

  return {
    appointmentId: appointment.id,
    flow: appointment.flow,
    consultationName: appointment.consultationType.name,
    startTime: appointment.startTime.toISOString(),
    isCompleted,
  };
}

export interface PendingFormAppointment {
  id: string;
  flow: "INTAKE" | "FOLLOW_UP";
  title: string;
  start: string;
}

/** Citas próximas que aún requieren completar su formulario. */
export async function getPendingFormAppointments(): Promise<
  PendingFormAppointment[]
> {
  const session = await auth();
  if (!session?.user?.id) return [];

  const profile = await prisma.patientProfile.findUnique({
    where: { userId: session.user.id },
    select: { hasCompletedIntake: true },
  });

  const appts = await prisma.appointment.findMany({
    where: {
      patientId: session.user.id,
      status: { in: ["PENDING", "CONFIRMED"] },
      startTime: { gte: new Date() },
    },
    include: {
      consultationType: true,
      followUpSubmission: true,
    },
    orderBy: { startTime: "asc" },
  });

  return appts
    .filter((a) => {
      if (a.flow === "INTAKE") return !profile?.hasCompletedIntake;
      return !a.followUpSubmission;
    })
    .map((a) => ({
      id: a.id,
      flow: a.flow,
      title: a.consultationType.name,
      start: a.startTime.toISOString(),
    }));
}

export interface PatientListItem {
  id: string;
  name: string;
  email: string;
  hasCompletedIntake: boolean;
  appointmentCount: number;
}

/** Listado de pacientes (solo ADMIN). */
export async function getPatientsList(): Promise<PatientListItem[]> {
  const session = await auth();
  if (session?.user?.role !== "ADMIN") return [];

  const patients = await prisma.user.findMany({
    where: { role: "PATIENT" },
    include: {
      patientProfile: true,
      _count: { select: { appointments: true } },
    },
    orderBy: { name: "asc" },
  });

  return patients.map((p) => ({
    id: p.id,
    name: p.name,
    email: p.email,
    hasCompletedIntake: p.patientProfile?.hasCompletedIntake ?? false,
    appointmentCount: p._count.appointments,
  }));
}

export interface PatientDetailDTO {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  profile: {
    birthDate: string | null;
    gender: string | null;
    height: number | null;
    occupation: string | null;
    emergencyPhone: string | null;
    hasCompletedIntake: boolean;
  } | null;
  intakeForm: {
    medicalHistory: unknown;
    allergies: unknown;
    dietaryHabits: unknown;
    physicalActivity: unknown;
    goals: string | null;
    supplementsUse: unknown;
    createdAt: string;
  } | null;
  measurements: {
    id: string;
    measuredAt: string;
    weight: number | null;
    bodyFatPct: number | null;
    waist: number | null;
    hip: number | null;
  }[];
  recentFollowUps: {
    appointmentDate: string;
    consultationName: string;
    energyLevel: string | null;
    adherence: string | null;
    symptoms: string | null;
    notes: string | null;
    currentWeight: number | null;
  }[];
}

/** Mediciones del paciente autenticado. */
export async function getMyMeasurements() {
  const session = await auth();
  if (!session?.user?.id) return [];

  const profile = await prisma.patientProfile.findUnique({
    where: { userId: session.user.id },
    include: {
      measurements: { orderBy: { measuredAt: "desc" }, take: 20 },
    },
  });

  return (profile?.measurements ?? []).map((m) => ({
    id: m.id,
    measuredAt: m.measuredAt.toISOString(),
    weight: m.weight,
    bodyFatPct: m.bodyFatPct,
    waist: m.waist,
    hip: m.hip,
  }));
}

/** Ficha completa de un paciente (solo ADMIN). */
export async function getPatientDetail(
  patientId: string,
): Promise<PatientDetailDTO | null> {
  const session = await auth();
  if (session?.user?.role !== "ADMIN") return null;

  const patient = await prisma.user.findFirst({
    where: { id: patientId, role: "PATIENT" },
    include: {
      patientProfile: {
        include: {
          intakeForm: true,
          measurements: { orderBy: { measuredAt: "desc" }, take: 10 },
        },
      },
      appointments: {
        where: { flow: "FOLLOW_UP" },
        include: {
          consultationType: true,
          followUpSubmission: true,
        },
        orderBy: { startTime: "desc" },
        take: 5,
      },
    },
  });

  if (!patient) return null;

  const profile = patient.patientProfile;

  return {
    id: patient.id,
    name: patient.name,
    email: patient.email,
    phone: patient.phone,
    profile: profile
      ? {
          birthDate: profile.birthDate?.toISOString() ?? null,
          gender: profile.gender,
          height: profile.height,
          occupation: profile.occupation,
          emergencyPhone: profile.emergencyPhone,
          hasCompletedIntake: profile.hasCompletedIntake,
        }
      : null,
    intakeForm: profile?.intakeForm
      ? {
          medicalHistory: profile.intakeForm.medicalHistory,
          allergies: profile.intakeForm.allergies,
          dietaryHabits: profile.intakeForm.dietaryHabits,
          physicalActivity: profile.intakeForm.physicalActivity,
          goals: profile.intakeForm.goals,
          supplementsUse: profile.intakeForm.supplementsUse,
          createdAt: profile.intakeForm.createdAt.toISOString(),
        }
      : null,
    measurements: (profile?.measurements ?? []).map((m) => ({
      id: m.id,
      measuredAt: m.measuredAt.toISOString(),
      weight: m.weight,
      bodyFatPct: m.bodyFatPct,
      waist: m.waist,
      hip: m.hip,
    })),
    recentFollowUps: patient.appointments
      .filter((a) => a.followUpSubmission)
      .map((a) => ({
        appointmentDate: a.startTime.toISOString(),
        consultationName: a.consultationType.name,
        energyLevel: a.followUpSubmission!.energyLevel,
        adherence: a.followUpSubmission!.adherence,
        symptoms: a.followUpSubmission!.symptoms,
        notes: a.followUpSubmission!.notes,
        currentWeight: a.followUpSubmission!.currentWeight,
      })),
  };
}
