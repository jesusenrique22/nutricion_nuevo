"use server";

import { auth } from "@/lib/auth";
import { areFormsEnabled } from "@/lib/feature-flags";
import { prisma } from "@/server/db/prisma";
import {
  type ConsultationFormType,
  isConsultationFormCompleted,
  resolveConsultationFormType,
} from "@/lib/form-routing";
import { templateCodeForFormType } from "@/lib/form-template-routing";
import {
  buildFormDisplayRows,
  flattenIntakeForm,
  flattenSubmissionRecord,
} from "@/lib/form-submission-display";
import { getFormTemplateByCode } from "@/server/actions/cms.actions";
import type { FormDisplayRow } from "@/lib/form-submission-display";
import { toPaymentPhaseView } from "@/lib/payment-split";
import { demographicsFromPayload } from "@/server/services/patient-profile-sync";

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
  if (!areFormsEnabled()) return null;

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
  if (!areFormsEnabled()) return [];

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
    where: {
      role: "PATIENT",
      OR: [
        { patientProfile: { is: null } },
        { patientProfile: { hiddenFromAdminList: false } },
      ],
    },
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
    gender: string | null;
    height: number | null;
    hasCompletedIntake: boolean;
  } | null;
}

async function resolveFichaDemographics(
  patientId: string,
  profile: { gender: string | null; height: number | null } | null,
): Promise<{ gender: string | null; height: number | null }> {
  let gender = profile?.gender ?? null;
  let height = profile?.height ?? null;

  if (gender && height != null) {
    return { gender, height };
  }

  const [nutrition, anthropometry, training] = await Promise.all([
    prisma.nutritionFormSubmission.findFirst({
      where: { appointment: { patientId } },
      orderBy: { createdAt: "desc" },
      select: { gender: true, extendedPayload: true },
    }),
    prisma.anthropometryFormSubmission.findFirst({
      where: { appointment: { patientId } },
      orderBy: { createdAt: "desc" },
      select: { gender: true, extendedPayload: true },
    }),
    prisma.trainingFormSubmission.findFirst({
      where: { appointment: { patientId } },
      orderBy: { createdAt: "desc" },
      select: { gender: true, extendedPayload: true },
    }),
  ]);

  for (const row of [nutrition, anthropometry, training]) {
    if (!row) continue;
    const extended =
      row.extendedPayload &&
      typeof row.extendedPayload === "object" &&
      !Array.isArray(row.extendedPayload)
        ? (row.extendedPayload as Record<string, unknown>)
        : {};
    const demo = demographicsFromPayload({
      gender: row.gender,
      height: extended.height,
    });
    if (!gender && demo.gender) gender = demo.gender;
    if (height == null && demo.height != null) height = demo.height;
    if (gender && height != null) break;
  }

  return { gender, height };
}

export interface PatientFichaAppointment {
  id: string;
  start: string;
  end: string;
  title: string;
  status: string;
  modality: string;
  flow: string;
  price: string;
  paymentStatus: string | null;
  cancelledBy: "PATIENT" | "ADMIN" | null;
  cancelledAt: string | null;
  paymentPhases: {
    advanceAmount: string;
    remainderAmount: string;
    advancePercent: number;
    advanceStatus: string;
    remainderStatus: string;
    overallStatus: string;
  } | null;
}

export interface PatientFichaPurchase {
  id: string;
  resourceId: string;
  title: string;
  type: string;
  pricePaid: string;
  status: "PENDING" | "GRANTED" | "REFUNDED";
  purchasedAt: string;
  grantedAt: string | null;
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

/** Ficha de un paciente — datos básicos (solo ADMIN). */
export async function getPatientDetail(
  patientId: string,
): Promise<PatientDetailDTO | null> {
  const session = await auth();
  if (session?.user?.role !== "ADMIN") return null;

  const patient = await prisma.user.findFirst({
    where: { id: patientId, role: "PATIENT" },
    include: { patientProfile: true },
  });

  if (!patient) return null;

  const profile = patient.patientProfile;
  const demographics = profile
    ? await resolveFichaDemographics(patientId, {
        gender: profile.gender,
        height: profile.height,
      })
    : { gender: null, height: null };

  return {
    id: patient.id,
    name: patient.name,
    email: patient.email,
    phone: patient.phone,
    profile: profile
      ? {
          gender: demographics.gender,
          height: demographics.height,
          hasCompletedIntake: profile.hasCompletedIntake,
        }
      : null,
  };
}

/** Consultas del paciente (solo ADMIN). */
export async function getPatientAppointmentsAdmin(
  patientId: string,
): Promise<PatientFichaAppointment[]> {
  const session = await auth();
  if (session?.user?.role !== "ADMIN") return [];

  const appts = await prisma.appointment.findMany({
    where: { patientId },
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
    price: a.consultationType.price.toString(),
    paymentStatus: a.payment?.status ?? null,
    cancelledBy: a.cancelledBy,
    cancelledAt: a.cancelledAt?.toISOString() ?? null,
    paymentPhases: a.payment ? toPaymentPhaseView(a.payment) : null,
  }));
}

/** Recursos y paquetes adquiridos (solo ADMIN). */
export async function getPatientPurchasesAdmin(
  patientId: string,
): Promise<PatientFichaPurchase[]> {
  const session = await auth();
  if (session?.user?.role !== "ADMIN") return [];

  const rows = await prisma.resourcePurchase.findMany({
    where: { userId: patientId, status: "GRANTED" },
    include: { resource: true },
    orderBy: { createdAt: "desc" },
  });

  return rows.map((row) => ({
    id: row.id,
    resourceId: row.resourceId,
    title: row.resource.title,
    type: row.resource.type,
    pricePaid: row.pricePaid.toString(),
    status: row.status,
    purchasedAt: row.createdAt.toISOString(),
    grantedAt: row.grantedAt?.toISOString() ?? null,
  }));
}

export interface PatientFormHistoryItem {
  formKey: string;
  appointmentId: string | null;
  submittedAt: string;
  appointmentDate: string | null;
  consultationName: string;
  formType: ConsultationFormType | "intake";
  title: string;
  flow: "INTAKE" | "FOLLOW_UP" | null;
}

export interface AdminFormSubmissionDetail {
  patientId: string;
  patientName: string;
  formKey: string;
  title: string;
  consultationName: string;
  appointmentDate: string | null;
  submittedAt: string;
  formType: ConsultationFormType | "intake";
  flow: "INTAKE" | "FOLLOW_UP" | null;
  rows: FormDisplayRow[];
}

const FORM_TYPE_TITLES: Record<ConsultationFormType | "intake", string> = {
  intake: "Anamnesis (formulario de ingreso)",
  nutrition: "Primera consulta nutricional",
  training: "Evaluación de entrenamiento",
  anthropometry: "Evaluación antropométrica",
  follow_up: "Formulario de seguimiento",
};

function submissionMeta(
  appointment: {
    id: string;
    startTime: Date;
    flow: "INTAKE" | "FOLLOW_UP";
    consultationType: { name: string };
  },
  formType: ConsultationFormType,
  submittedAt: Date,
): PatientFormHistoryItem {
  return {
    formKey: appointment.id,
    appointmentId: appointment.id,
    submittedAt: submittedAt.toISOString(),
    appointmentDate: appointment.startTime.toISOString(),
    consultationName: appointment.consultationType.name,
    formType,
    title: FORM_TYPE_TITLES[formType],
    flow: appointment.flow,
  };
}

/** Historial de formularios enviados por un paciente (solo ADMIN). */
export async function getPatientFormHistory(
  patientId: string,
): Promise<PatientFormHistoryItem[]> {
  if (!areFormsEnabled()) return [];

  const session = await auth();
  if (session?.user?.role !== "ADMIN") return [];

  const patient = await prisma.user.findFirst({
    where: { id: patientId, role: "PATIENT" },
    include: {
      patientProfile: { include: { intakeForm: true } },
      appointments: {
        include: {
          consultationType: true,
          followUpSubmission: true,
          anthropometryFormSubmission: true,
          nutritionFormSubmission: true,
          trainingFormSubmission: true,
        },
        orderBy: { startTime: "desc" },
      },
    },
  });

  if (!patient) return [];

  const items: PatientFormHistoryItem[] = [];

  if (patient.patientProfile?.intakeForm) {
    const intake = patient.patientProfile.intakeForm;
    items.push({
      formKey: "intake",
      appointmentId: null,
      submittedAt: intake.createdAt.toISOString(),
      appointmentDate: null,
      consultationName: "Ingreso general",
      formType: "intake",
      title: FORM_TYPE_TITLES.intake,
      flow: null,
    });
  }

  for (const appointment of patient.appointments) {
    if (appointment.nutritionFormSubmission) {
      items.push(
        submissionMeta(
          appointment,
          "nutrition",
          appointment.nutritionFormSubmission.createdAt,
        ),
      );
    }
    if (appointment.trainingFormSubmission) {
      items.push(
        submissionMeta(
          appointment,
          "training",
          appointment.trainingFormSubmission.createdAt,
        ),
      );
    }
    if (appointment.anthropometryFormSubmission) {
      items.push(
        submissionMeta(
          appointment,
          "anthropometry",
          appointment.anthropometryFormSubmission.createdAt,
        ),
      );
    }
    if (appointment.followUpSubmission) {
      items.push(
        submissionMeta(
          appointment,
          "follow_up",
          appointment.followUpSubmission.createdAt,
        ),
      );
    }
  }

  return items.sort(
    (a, b) =>
      new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime(),
  );
}

/** Detalle de un formulario enviado (solo ADMIN). formKey = appointmentId o "intake". */
export async function getAdminFormSubmissionDetail(
  patientId: string,
  formKey: string,
): Promise<AdminFormSubmissionDetail | null> {
  if (!areFormsEnabled()) return null;

  const session = await auth();
  if (session?.user?.role !== "ADMIN") return null;

  const patient = await prisma.user.findFirst({
    where: { id: patientId, role: "PATIENT" },
    select: { id: true, name: true },
  });
  if (!patient) return null;

  if (formKey === "intake") {
    const profile = await prisma.patientProfile.findUnique({
      where: { userId: patientId },
      include: { intakeForm: true },
    });
    if (!profile?.intakeForm) return null;

    const template = await getFormTemplateByCode("intake");
    const flat = flattenIntakeForm({
      medicalHistory: profile.intakeForm.medicalHistory,
      allergies: profile.intakeForm.allergies,
      dietaryHabits: profile.intakeForm.dietaryHabits,
      physicalActivity: profile.intakeForm.physicalActivity,
      goals: profile.intakeForm.goals,
      supplementsUse: profile.intakeForm.supplementsUse,
      extendedPayload: profile.intakeForm.extendedPayload,
    });

    if (profile.gender) flat.gender = profile.gender;
    if (profile.height != null) flat.height = profile.height;

    return {
      patientId: patient.id,
      patientName: patient.name,
      formKey,
      title: FORM_TYPE_TITLES.intake,
      consultationName: "Ingreso general",
      appointmentDate: null,
      submittedAt: profile.intakeForm.createdAt.toISOString(),
      formType: "intake",
      flow: null,
      rows: buildFormDisplayRows(flat, template?.fields ?? []),
    };
  }

  const appointment = await prisma.appointment.findFirst({
    where: { id: formKey, patientId },
    include: {
      consultationType: true,
      followUpSubmission: true,
      anthropometryFormSubmission: true,
      nutritionFormSubmission: true,
      trainingFormSubmission: true,
    },
  });
  if (!appointment) return null;

  const formType = resolveConsultationFormType(appointment);
  const templateCode = templateCodeForFormType(formType);
  const template = templateCode
    ? await getFormTemplateByCode(templateCode)
    : null;

  let record: Record<string, unknown> | null = null;
  let submittedAt: Date | null = null;

  if (appointment.followUpSubmission) {
    record = appointment.followUpSubmission as unknown as Record<
      string,
      unknown
    >;
    submittedAt = appointment.followUpSubmission.createdAt;
  } else if (appointment.nutritionFormSubmission) {
    record = appointment.nutritionFormSubmission as unknown as Record<
      string,
      unknown
    >;
    submittedAt = appointment.nutritionFormSubmission.createdAt;
  } else if (appointment.trainingFormSubmission) {
    record = appointment.trainingFormSubmission as unknown as Record<
      string,
      unknown
    >;
    submittedAt = appointment.trainingFormSubmission.createdAt;
  } else if (appointment.anthropometryFormSubmission) {
    record = appointment.anthropometryFormSubmission as unknown as Record<
      string,
      unknown
    >;
    submittedAt = appointment.anthropometryFormSubmission.createdAt;
  }

  if (!record || !submittedAt) return null;

  const flat = flattenSubmissionRecord(record);

  return {
    patientId: patient.id,
    patientName: patient.name,
    formKey,
    title: FORM_TYPE_TITLES[formType],
    consultationName: appointment.consultationType.name,
    appointmentDate: appointment.startTime.toISOString(),
    submittedAt: submittedAt.toISOString(),
    formType,
    flow: appointment.flow,
    rows: buildFormDisplayRows(flat, template?.fields ?? []),
  };
}
