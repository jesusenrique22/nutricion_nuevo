import { z } from "zod";
import { coverUrlValidationMessage } from "@/lib/resource-cover";
import {
  CONTENT_URL_VALIDATION_MESSAGE,
  isServableContentUrl,
} from "@/lib/stored-file-label";

export const resourceTypeSchema = z.enum([
  "EBOOK",
  "VIDEO",
  "LINK",
  "PACKAGE",
]);

export const upsertResourceSchema = z.object({
  id: z.string().optional(),
  title: z.string().trim().min(2, "Título requerido"),
  description: z.string().trim().optional(),
  type: resourceTypeSchema,
  coverUrl: z
    .string()
    .optional()
    .refine(
      (v) => coverUrlValidationMessage(v ?? "") === null,
      "La portada debe ser una imagen (.jpg, .png, .webp) o subir un archivo; no uses enlaces a artículos.",
    ),
  contentUrl: z
    .string()
    .optional()
    .refine(
      (v) => !v || v.trim() === "" || isServableContentUrl(v),
      CONTENT_URL_VALIDATION_MESSAGE,
    ),
  videoUrl: z.string().optional(),
  linkUrl: z
    .string()
    .optional()
    .refine(
      (v) => !v || v === "" || z.string().url().safeParse(v).success,
      "URL inválida",
    ),
  body: z.string().optional(),
  price: z.coerce.number().min(0),
  currency: z.string().default("ARS"),
  category: z.string().optional(),
  isPublished: z.boolean().optional(),
  sortOrder: z.coerce.number().int().optional(),
});

export const grantResourceSchema = z.object({
  resourceId: z.string().min(1),
  userId: z.string().min(1),
  adminNote: z.string().max(300).optional(),
});
