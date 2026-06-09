"use server";

import { auth } from "@/lib/auth";
import { prisma } from "@/server/db/prisma";
import {
  type ConsultationFormType,
  isConsultationFormCompleted,
  resolveConsultationFormType,
} from "@/lib/form-routing";

export interface AppointmentFormContext {
  appointmentId: string;
  flow: "INTAKE" | "FOLLOW_UP";
  consultationCode: string;
  consultationName: string;
  startTime: string;
  isCompleted: boolean;
  formType: ConsultationFormType;
  patientEmail: string;
}

/** Contexto del formulario pendiente por índice (0 = próxima cita). Sin exponer ID en URL. */
export async function getPendingFormContext(
  slot = 0,
  preferLatest = false,
): Promise<AppointmentFormContext | null> {
  const session = await auth();
  if (!session?.user?.id) return null;

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
      patient: { include: { patientProfile: true } },
      followUpSubmission: true,
      anthropometryFormSubmission: true,
      nutritionFormSubmission: true,
      trainingFormSubmission: true,
    },
    orderBy: preferLatest
      ? { createdAt: "desc" }
      : { startTime: "asc" },
  });

  const pending = appts.filter(
    (a) =>
      !isConsultationFormCompleted(a, profile?.hasCompletedIntake ?? false),
  );

  const appointment = pending[slot] ?? pending[0];
  if (!appointment) return null;

  const formType = resolveConsultationFormType(appointment);

  return {
    appointmentId: appointment.id,
    flow: appointment.flow,
    consultationCode: appointment.consultationType.code,
    consultationName: appointment.consultationType.name,
    startTime: appointment.startTime.toISOString(),
    isCompleted: false,
    formType,
    patientEmail: appointment.patient.email,
  };
}

export interface PendingFormAppointment {
  id: string;
  flow: "INTAKE" | "FOLLOW_UP";
  formType: ConsultationFormType;
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
      anthropometryFormSubmission: true,
      nutritionFormSubmission: true,
      trainingFormSubmission: true,
    },
    orderBy: { startTime: "asc" },
  });

  return appts
    .filter(
      (a) =>
        !isConsultationFormCompleted(a, profile?.hasCompletedIntake ?? false),
    )
    .map((a) => ({
      id: a.id,
      flow: a.flow,
      formType: resolveConsultationFormType(a),
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
    extendedPayload: unknown;
    createdAt: string;
  } | null;
  measurements: {
    id: string;
    measuredAt: string;
    weight: number | null;
    bodyFatPct: number | null;
    muscleMass: number | null;
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
  anthropometryForms: {
    appointmentDate: string;
    fullName: string | null;
    mainObjective: string | null;
    evaluationFrequency: string | null;
    reportAnalysisTypes: unknown;
    procedureQuestions: string | null;
  }[];
  nutritionForms: {
    appointmentDate: string;
    consultationReason: string | null;
    continuationPreference: string | null;
  }[];
  trainingForms: {
    appointmentDate: string;
    fullName: string | null;
    mainObjective: string | null;
    evaluationFrequency: string | null;
    reportAnalysisTypes: unknown;
    procedureQuestions: string | null;
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
    muscleMass: m.muscleMass,
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
          measurements: { orderBy: { measuredAt: "desc" }, take: 30 },
        },
      },
      appointments: {
        include: {
          consultationType: true,
          followUpSubmission: true,
          anthropometryFormSubmission: true,
          nutritionFormSubmission: true,
          trainingFormSubmission: true,
        },
        orderBy: { startTime: "desc" },
        take: 10,
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
          extendedPayload: profile.intakeForm.extendedPayload,
          createdAt: profile.intakeForm.createdAt.toISOString(),
        }
      : null,
    measurements: (profile?.measurements ?? []).map((m) => ({
      id: m.id,
      measuredAt: m.measuredAt.toISOString(),
      weight: m.weight,
      bodyFatPct: m.bodyFatPct,
      muscleMass: m.muscleMass,
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
    anthropometryForms: patient.appointments
      .filter((a) => a.anthropometryFormSubmission)
      .map((a) => ({
        appointmentDate: a.startTime.toISOString(),
        fullName: a.anthropometryFormSubmission!.fullName,
        mainObjective: a.anthropometryFormSubmission!.mainObjective,
        evaluationFrequency:
          a.anthropometryFormSubmission!.evaluationFrequency,
        reportAnalysisTypes:
          a.anthropometryFormSubmission!.reportAnalysisTypes,
        procedureQuestions:
          a.anthropometryFormSubmission!.procedureQuestions,
      })),
    nutritionForms: patient.appointments
      .filter((a) => a.nutritionFormSubmission)
      .map((a) => ({
        appointmentDate: a.startTime.toISOString(),
        consultationReason:
          a.nutritionFormSubmission!.consultationReason,
        continuationPreference:
          a.nutritionFormSubmission!.continuationPreference,
      })),
    trainingForms: patient.appointments
      .filter((a) => a.trainingFormSubmission)
      .map((a) => ({
        appointmentDate: a.startTime.toISOString(),
        fullName: a.trainingFormSubmission!.fullName,
        mainObjective: a.trainingFormSubmission!.mainObjective,
        evaluationFrequency:
          a.trainingFormSubmission!.evaluationFrequency,
        reportAnalysisTypes:
          a.trainingFormSubmission!.reportAnalysisTypes,
        procedureQuestions:
          a.trainingFormSubmission!.procedureQuestions,
      })),
  };
}
