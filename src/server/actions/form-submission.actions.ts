"use server";

import { Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { validateDynamicFormPayload } from "@/lib/dynamic-form-schema";
import { areFormsEnabled, FORMS_DISABLED_MESSAGE } from "@/lib/feature-flags";
import {
  intakeExtendedPayload,
  mapFlatPayloadToIntake,
} from "@/lib/intake-form-map";
import { intakeFormSchema } from "@/lib/validators/intake";
import { getFormTemplateByCode } from "@/server/actions/cms.actions";
import { prisma } from "@/server/db/prisma";
import { withDb } from "@/lib/db-errors";

export type SubmitDynamicFormResult =
  | { ok: true }
  | { ok: false; message: string };

function str(v: unknown): string | null {
  if (v == null) return null;
  const s = String(v).trim();
  return s.length ? s : null;
}

function boolFromYesNo(v: unknown): boolean | null {
  if (v === "si" || v === true) return true;
  if (v === "no" || v === false) return false;
  return null;
}

function extendedOnly(
  payload: Record<string, unknown>,
  known: Set<string>,
): Prisma.InputJsonValue {
  const extra: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(payload)) {
    if (!known.has(k)) extra[k] = v;
  }
  return extra as Prisma.InputJsonValue;
}

async function persistFollowUp(
  appointmentId: string,
  userId: string,
  data: Record<string, unknown>,
) {
  const known = new Set([
    "currentWeight",
    "energyLevel",
    "adherence",
    "symptoms",
    "notes",
  ]);

  await prisma.$transaction(async (tx) => {
    await tx.followUpSubmission.create({
      data: {
        appointmentId,
        currentWeight:
          typeof data.currentWeight === "number"
            ? data.currentWeight
            : data.currentWeight != null
              ? Number(data.currentWeight)
              : null,
        energyLevel: str(data.energyLevel),
        adherence: str(data.adherence),
        symptoms: str(data.symptoms),
        notes: str(data.notes),
        extendedPayload: extendedOnly(data, known),
      },
    });

    const weight =
      typeof data.currentWeight === "number"
        ? data.currentWeight
        : data.currentWeight != null
          ? Number(data.currentWeight)
          : null;

    if (weight != null && !Number.isNaN(weight)) {
      const profile = await tx.patientProfile.findUnique({
        where: { userId },
      });
      if (profile) {
        await tx.anthropometryMeasurement.create({
          data: {
            patientProfileId: profile.id,
            appointmentId,
            weight,
            measuredAt: new Date(),
          },
        });
      }
    }
  });
}

async function persistNutrition(
  appointmentId: string,
  userId: string,
  data: Record<string, unknown>,
) {
  const known = new Set([
    "fullName",
    "phone",
    "gender",
    "birthDate",
    "consultationReason",
    "dietDescription",
    "dietaryRestrictions",
    "activityLevel",
    "activityFrequency",
    "sportsPracticed",
    "reservedSlotNote",
    "continuationPreference",
  ]);

  const birthDate = str(data.birthDate);
  if (!birthDate) throw new Error("Fecha de nacimiento requerida.");

  await prisma.$transaction([
    prisma.nutritionFormSubmission.create({
      data: {
        appointmentId,
        fullName: str(data.fullName),
        phone: str(data.phone),
        gender: str(data.gender),
        birthDate: new Date(birthDate),
        consultationReason: str(data.consultationReason),
        dietDescription: str(data.dietDescription),
        dietaryRestrictions: str(data.dietaryRestrictions),
        activityLevel: str(data.activityLevel),
        activityFrequency: str(data.activityFrequency),
        sportsPracticed: str(data.sportsPracticed),
        reservedSlotNote: str(data.reservedSlotNote),
        continuationPreference: str(data.continuationPreference),
        extendedPayload: extendedOnly(data, known),
      },
    }),
    prisma.patientProfile.upsert({
      where: { userId },
      create: {
        userId,
        birthDate: new Date(birthDate),
        gender: str(data.gender),
        emergencyPhone: str(data.phone),
        hasCompletedIntake: true,
      },
      update: {
        birthDate: new Date(birthDate),
        gender: str(data.gender),
        emergencyPhone: str(data.phone),
        hasCompletedIntake: true,
      },
    }),
    prisma.user.update({
      where: { id: userId },
      data: {
        phone: str(data.phone),
        name: str(data.fullName) ?? undefined,
      },
    }),
  ]);
}

async function persistAnthropometryOrTraining(
  templateCode: "anthropometry" | "training",
  appointmentId: string,
  userId: string,
  data: Record<string, unknown>,
) {
  const known = new Set([
    "consentAccepted",
    "fullName",
    "consultationReason",
    "phone",
    "gender",
    "birthDate",
    "previousAnthropometry",
    "dominantHand",
    "dominantFoot",
    "activityLevel",
    "activityFrequency",
    "sportsPracticed",
    "reportAnalysisTypes",
    "mainObjective",
    "evaluationFrequency",
    "reservedSlotNote",
    "procedureQuestions",
  ]);

  const birthDate = str(data.birthDate);
  if (!birthDate) throw new Error("Fecha de nacimiento requerida.");

  const reportTypes = Array.isArray(data.reportAnalysisTypes)
    ? data.reportAnalysisTypes.map(String)
    : [];

  const base = {
    appointmentId,
    consentAccepted: data.consentAccepted === true,
    fullName: str(data.fullName),
    consultationReason: str(data.consultationReason),
    phone: str(data.phone),
    gender: str(data.gender),
    birthDate: new Date(birthDate),
    previousAnthropometry: boolFromYesNo(data.previousAnthropometry),
    dominantHand: str(data.dominantHand),
    dominantFoot: str(data.dominantFoot),
    activityLevel: str(data.activityLevel),
    activityFrequency: str(data.activityFrequency),
    sportsPracticed: str(data.sportsPracticed),
    reportAnalysisTypes: reportTypes,
    mainObjective: str(data.mainObjective),
    evaluationFrequency: str(data.evaluationFrequency),
    reservedSlotNote: str(data.reservedSlotNote),
    procedureQuestions: str(data.procedureQuestions),
    extendedPayload: extendedOnly(data, known),
  };

  if (templateCode === "anthropometry") {
    await prisma.$transaction([
      prisma.anthropometryFormSubmission.create({ data: base }),
      prisma.patientProfile.upsert({
        where: { userId },
        create: {
          userId,
          birthDate: new Date(birthDate),
          gender: str(data.gender),
          emergencyPhone: str(data.phone),
          hasCompletedIntake: true,
        },
        update: {
          birthDate: new Date(birthDate),
          gender: str(data.gender),
          emergencyPhone: str(data.phone),
          hasCompletedIntake: true,
        },
      }),
      prisma.user.update({
        where: { id: userId },
        data: {
          phone: str(data.phone),
          name: str(data.fullName) ?? undefined,
        },
      }),
    ]);
  } else {
    await prisma.$transaction([
      prisma.trainingFormSubmission.create({ data: base }),
      prisma.patientProfile.upsert({
        where: { userId },
        create: {
          userId,
          birthDate: new Date(birthDate),
          gender: str(data.gender),
          emergencyPhone: str(data.phone),
          hasCompletedIntake: true,
        },
        update: {
          birthDate: new Date(birthDate),
          gender: str(data.gender),
          emergencyPhone: str(data.phone),
          hasCompletedIntake: true,
        },
      }),
      prisma.user.update({
        where: { id: userId },
        data: {
          phone: str(data.phone),
          name: str(data.fullName) ?? undefined,
        },
      }),
    ]);
  }
}

async function persistIntake(
  appointmentId: string,
  userId: string,
  flat: Record<string, unknown>,
) {
  const appointment = await prisma.appointment.findFirst({
    where: {
      id: appointmentId,
      patientId: userId,
      flow: "INTAKE",
    },
    include: { patient: { include: { patientProfile: true } } },
  });

  if (!appointment?.patient.patientProfile) {
    throw new Error("Perfil de paciente no encontrado.");
  }

  const profile = appointment.patient.patientProfile;
  if (profile.hasCompletedIntake) {
    throw new Error("Ya completaste tu formulario de ingreso.");
  }

  const nested = mapFlatPayloadToIntake(flat);
  const parsed = intakeFormSchema.safeParse(nested);
  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message ?? "Datos inválidos.");
  }

  const { profile: prof, ...intake } = parsed.data;
  const extra = intakeExtendedPayload(flat);

  await prisma.$transaction([
    prisma.patientProfile.update({
      where: { id: profile.id },
      data: {
        birthDate: new Date(prof.birthDate),
        gender: prof.gender,
        height: prof.height,
        occupation: prof.occupation ?? null,
        emergencyPhone: prof.emergencyPhone,
        hasCompletedIntake: true,
      },
    }),
    prisma.intakeForm.create({
      data: {
        patientProfileId: profile.id,
        medicalHistory: intake.medicalHistory,
        allergies: intake.allergies,
        dietaryHabits: intake.dietaryHabits,
        physicalActivity: intake.physicalActivity,
        goals: intake.goals,
        supplementsUse: intake.supplementsUse,
        extendedPayload:
          Object.keys(extra).length > 0
            ? (extra as Prisma.InputJsonValue)
            : undefined,
      },
    }),
  ]);
}

export async function submitDynamicConsultationForm(
  templateCode: string,
  appointmentId: string,
  payload: unknown,
): Promise<SubmitDynamicFormResult> {
  if (!areFormsEnabled()) {
    return { ok: false, message: FORMS_DISABLED_MESSAGE };
  }

  const session = await auth();
  if (!session?.user?.id) {
    return { ok: false, message: "Debes iniciar sesión." };
  }

  const template = await getFormTemplateByCode(templateCode);
  if (!template?.fields?.length) {
    return { ok: false, message: "Plantilla de formulario no encontrada." };
  }

  const parsed = validateDynamicFormPayload(template.fields, payload);
  if (!parsed.success) {
    return {
      ok: false,
      message: parsed.error.issues[0]?.message ?? "Datos inválidos.",
    };
  }

  const data = parsed.data as Record<string, unknown>;

  const appointment = await prisma.appointment.findFirst({
    where: { id: appointmentId, patientId: session.user.id },
    include: {
      consultationType: true,
      anthropometryFormSubmission: true,
      nutritionFormSubmission: true,
      trainingFormSubmission: true,
      followUpSubmission: true,
    },
  });

  if (!appointment) {
    return { ok: false, message: "Cita no encontrada." };
  }

  if (appointment.status !== "PENDING" && appointment.status !== "CONFIRMED") {
    return { ok: false, message: "Esta cita ya no acepta formularios." };
  }

  try {
    switch (templateCode) {
      case "follow_up": {
        if (appointment.flow !== "FOLLOW_UP") {
          return { ok: false, message: "Esta cita no es de seguimiento." };
        }
        if (appointment.followUpSubmission) {
          return { ok: false, message: "Ya enviaste este formulario." };
        }
        await persistFollowUp(appointmentId, session.user.id, data);
        break;
      }
      case "nutrition": {
        if (appointment.consultationType.code !== "NUT_01") {
          return { ok: false, message: "Cita nutricional no válida." };
        }
        if (appointment.nutritionFormSubmission) {
          return { ok: false, message: "Ya enviaste este formulario." };
        }
        const result = await withDb(() =>
          persistNutrition(appointmentId, session.user!.id, data),
        );
        if (!result.ok) return { ok: false, message: result.message };
        break;
      }
      case "anthropometry": {
        if (appointment.consultationType.code !== "ANT_03") {
          return { ok: false, message: "Cita de antropometría no válida." };
        }
        if (appointment.anthropometryFormSubmission) {
          return { ok: false, message: "Ya enviaste este formulario." };
        }
        const result = await withDb(() =>
          persistAnthropometryOrTraining(
            "anthropometry",
            appointmentId,
            session.user!.id,
            data,
          ),
        );
        if (!result.ok) return { ok: false, message: result.message };
        break;
      }
      case "training": {
        if (appointment.consultationType.code !== "ENT_02") {
          return { ok: false, message: "Cita de entrenamiento no válida." };
        }
        if (appointment.trainingFormSubmission) {
          return { ok: false, message: "Ya enviaste este formulario." };
        }
        const result = await withDb(() =>
          persistAnthropometryOrTraining(
            "training",
            appointmentId,
            session.user!.id,
            data,
          ),
        );
        if (!result.ok) return { ok: false, message: result.message };
        break;
      }
      case "intake": {
        if (appointment.flow !== "INTAKE") {
          return { ok: false, message: "Cita no encontrada o no requiere ingreso." };
        }
        const result = await withDb(() =>
          persistIntake(appointmentId, session.user!.id, data),
        );
        if (!result.ok) return { ok: false, message: result.message };
        break;
      }
      default:
        return { ok: false, message: "Tipo de formulario no soportado." };
    }
  } catch (err) {
    return {
      ok: false,
      message: err instanceof Error ? err.message : "Error al guardar.",
    };
  }

  revalidatePath("/dashboard/patient/appointments");
  revalidatePath("/dashboard/patient/appointments/form");
  return { ok: true };
}
