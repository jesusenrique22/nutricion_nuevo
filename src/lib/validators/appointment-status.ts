import { z } from "zod";

export const appointmentStatusSchema = z.enum([
  "PENDING",
  "CONFIRMED",
  "COMPLETED",
  "CANCELLED",
  "NO_SHOW",
]);

export const updateAppointmentStatusSchema = z.object({
  appointmentId: z.string().min(1),
  status: appointmentStatusSchema,
  notes: z.string().max(500).optional(),
});

export const cancelAppointmentSchema = z.object({
  appointmentId: z.string().min(1),
});

export const markPaymentSchema = z.object({
  appointmentId: z.string().min(1),
  adminNote: z.string().max(300).optional(),
});

export const markPaymentPhaseSchema = z.object({
  appointmentId: z.string().min(1),
  phase: z.enum(["advance", "remainder", "full"]),
  adminNote: z.string().max(300).optional(),
});

export const paymentChatPolicySchema = z.object({
  advancePercent: z.coerce.number().int().min(0).max(100),
  remainderPercent: z.coerce.number().int().min(0).max(100),
  chatUnlockOnAppointment: z.boolean(),
  chatUnlockOnAdvancePaid: z.boolean(),
  chatUnlockOnRemainderPaid: z.boolean(),
});
