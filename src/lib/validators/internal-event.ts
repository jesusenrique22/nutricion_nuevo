import { z } from "zod";
import { INTERNAL_EVENT_KINDS } from "@/lib/internal-event";

/** A quién se le avisa: nadie, un paciente de la plataforma, o un correo suelto. */
export const internalEventAttendeeSchema = z.enum([
  "NONE",
  "PATIENT",
  "GUEST",
]);

export const upsertInternalEventSchema = z
  .object({
    id: z.string().min(1).optional(),
    title: z.string().trim().min(2, "Poné un título para el evento").max(140),
    description: z.string().trim().max(2000).optional(),
    kind: z.enum(INTERNAL_EVENT_KINDS),
    dateStr: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Fecha inválida"),
    startTime: z.string().regex(/^\d{2}:\d{2}$/, "Hora inválida"),
    durationMinutes: z
      .coerce.number()
      .int()
      .min(5, "Mínimo 5 minutos")
      .max(600, "Máximo 10 horas"),
    modality: z.enum(["ONLINE", "PRESENCIAL"]),
    location: z.string().trim().max(300).optional(),

    attendeeType: internalEventAttendeeSchema,
    patientId: z.string().min(1).optional(),
    guestName: z.string().trim().max(120).optional(),
    guestEmail: z
      .string()
      .trim()
      .max(200)
      .optional()
      .or(z.literal("")),

    /** Vacío o 0 = sin cobro, que es el caso normal de estos eventos. */
    chargeAmount: z.coerce.number().min(0).optional(),
    chargeCurrency: z.string().trim().max(8).optional(),

    /** Si no, el evento queda solo en la agenda sin avisarle a nadie. */
    notifyAttendee: z.boolean().optional(),
  })
  .superRefine((data, ctx) => {
    if (data.attendeeType === "PATIENT" && !data.patientId) {
      ctx.addIssue({
        code: "custom",
        path: ["patientId"],
        message: "Elegí el paciente que participa del evento.",
      });
    }

    if (data.attendeeType === "GUEST") {
      const email = data.guestEmail?.trim() ?? "";
      if (!email) {
        ctx.addIssue({
          code: "custom",
          path: ["guestEmail"],
          message: "Ingresá el correo de la persona invitada.",
        });
      } else if (!z.string().email().safeParse(email).success) {
        ctx.addIssue({
          code: "custom",
          path: ["guestEmail"],
          message: "Ese correo no parece válido.",
        });
      }
    }
  });

export type UpsertInternalEventInput = z.infer<
  typeof upsertInternalEventSchema
>;

export const deleteInternalEventSchema = z.object({
  id: z.string().min(1),
  /** Avisarle al participante que el evento se canceló. */
  notify: z.boolean().optional(),
});

export const markInternalEventChargeSchema = z.object({
  id: z.string().min(1),
  paid: z.boolean(),
});
