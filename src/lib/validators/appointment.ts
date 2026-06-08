import { z } from "zod";

export const createAppointmentSchema = z.object({
  consultationTypeId: z.string().min(1, "Tipo de consulta requerido"),
  // ISO datetime string del inicio de la cita
  startTime: z.string().datetime(),
  modality: z.enum(["ONLINE", "PRESENCIAL"]),
});

export type CreateAppointmentInput = z.infer<typeof createAppointmentSchema>;
