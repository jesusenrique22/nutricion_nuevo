import { ConsultationCode, AppointmentFlow } from "@prisma/client";

export type ConsultationFormType =
  | "anthropometry"
  | "nutrition"
  | "training"
  | "intake"
  | "follow_up";

type AppointmentLike = {
  flow: AppointmentFlow;
  consultationType: { code: ConsultationCode };
  anthropometryFormSubmission?: unknown | null;
  nutritionFormSubmission?: unknown | null;
  trainingFormSubmission?: unknown | null;
  followUpSubmission?: unknown | null;
};

export function resolveConsultationFormType(
  appointment: AppointmentLike,
): ConsultationFormType {
  const code = appointment.consultationType.code;

  if (code === "ANT_03") {
    return appointment.flow === "FOLLOW_UP" ? "follow_up" : "anthropometry";
  }
  if (code === "NUT_01") {
    return appointment.flow === "FOLLOW_UP" ? "follow_up" : "nutrition";
  }
  if (code === "ENT_02") {
    return appointment.flow === "FOLLOW_UP" ? "follow_up" : "training";
  }
  return appointment.flow === "INTAKE" ? "intake" : "follow_up";
}

export function isConsultationFormCompleted(
  appointment: AppointmentLike,
  hasCompletedIntake = false,
): boolean {
  const formType = resolveConsultationFormType(appointment);

  switch (formType) {
    case "anthropometry":
      return Boolean(appointment.anthropometryFormSubmission);
    case "nutrition":
      return Boolean(appointment.nutritionFormSubmission);
    case "training":
      return Boolean(appointment.trainingFormSubmission);
    case "intake":
      return hasCompletedIntake;
    case "follow_up":
      return Boolean(appointment.followUpSubmission);
  }
}
