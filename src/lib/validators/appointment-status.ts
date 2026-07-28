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

export const rescheduleAppointmentSchema = z.object({
  appointmentId: z.string().min(1),
  startTime: z.string().datetime(),
});

export const createScheduleBlockSchema = z.object({
  dateStr: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  startTime: z.string().regex(/^\d{2}:\d{2}$/),
  endTime: z.string().regex(/^\d{2}:\d{2}$/),
  reason: z.string().max(200).optional(),
});

export const deleteScheduleBlockSchema = z.object({
  id: z.string().min(1),
});

export const createBlockedDaysSchema = z.object({
  fromDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  toDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  reason: z.string().max(200).optional(),
});

export const deleteBlockedDaySchema = z.object({
  id: z.string().min(1),
});

const hhmm = z
  .string()
  .regex(/^\d{2}:\d{2}$/, "Hora inválida")
  .optional();

export const createRecurringBlockedWeekdaysSchema = z
  .object({
    weekdays: z
      .array(z.number().int().min(0).max(6))
      .min(1, "Elegí al menos un día"),
    reason: z.string().max(200).optional(),
    /** HH:mm — con endTime = franja; sin ambos = día completo. */
    startTime: hhmm,
    endTime: hhmm,
  })
  .superRefine((data, ctx) => {
    const hasStart = Boolean(data.startTime);
    const hasEnd = Boolean(data.endTime);
    if (hasStart !== hasEnd) {
      ctx.addIssue({
        code: "custom",
        message: "Indicá hora de inicio y de fin, o dejá ambas vacías (día completo).",
      });
      return;
    }
    if (hasStart && hasEnd) {
      const [sh, sm] = data.startTime!.split(":").map(Number);
      const [eh, em] = data.endTime!.split(":").map(Number);
      if (eh * 60 + em <= sh * 60 + sm) {
        ctx.addIssue({
          code: "custom",
          message: "La hora de fin debe ser posterior al inicio.",
        });
      }
    }
  });

export const deleteRecurringBlockedWeekdaySchema = z.object({
  id: z.string().min(1),
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
