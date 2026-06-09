import { z } from "zod";

const optionalPositive = z.coerce.number().positive().optional();

export const createMeasurementSchema = z
  .object({
    patientId: z.string().min(1),
    appointmentId: z.string().optional(),
    measuredAt: z.string().optional(),
    weight: optionalPositive,
    bodyFatPct: z.coerce.number().min(0).max(100).optional(),
    muscleMass: optionalPositive,
    waist: optionalPositive,
    hip: optionalPositive,
    notes: z.string().max(500).optional(),
  })
  .refine(
    (d) =>
      d.weight != null ||
      d.bodyFatPct != null ||
      d.muscleMass != null ||
      d.waist != null ||
      d.hip != null,
    { message: "Ingresa al menos un valor de medición." },
  );

export type CreateMeasurementInput = z.infer<typeof createMeasurementSchema>;
