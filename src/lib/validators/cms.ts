import { z } from "zod";

export const updateConsultationPriceSchema = z.object({
  id: z.string().min(1),
  name: z.string().trim().min(2),
  description: z.string().trim().optional(),
  price: z.coerce.number().min(0),
  durationMinutes: z.coerce.number().int().min(15).max(240),
});

export const updateSiteContentSchema = z.object({
  slug: z.string().min(1),
  title: z.string().optional(),
  data: z.record(z.string(), z.unknown()),
});

const formFieldOptionSchema = z.object({
  value: z.string().min(1),
  label: z.string().min(1),
});

const formFieldSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  label: z.string().min(1),
  type: z.enum([
    "text",
    "textarea",
    "email",
    "tel",
    "date",
    "time",
    "url",
    "number",
    "select",
    "radio",
    "checkbox-group",
    "checkbox",
  ]),
  required: z.boolean().optional(),
  step: z.number().optional(),
  placeholder: z.string().optional(),
  helpText: z.string().optional(),
  minLength: z.number().optional(),
  min: z.number().optional(),
  max: z.number().optional(),
  colSpan: z.union([z.literal(1), z.literal(2)]).optional(),
  options: z.array(formFieldOptionSchema).optional(),
});

export const updateFormTemplateSchema = z.object({
  code: z.string().min(1),
  name: z.string().trim().min(2),
  fields: z.array(formFieldSchema).min(1),
});

const weeklyMealSchema = z.object({
  time: z.string().optional(),
  title: z.string().min(1),
  description: z.string().optional(),
  items: z.string().optional(),
});

const weeklyDaySchema = z.object({
  day: z.string().min(1),
  meals: z.array(weeklyMealSchema).min(1),
});

export const upsertWeeklyPlanSchema = z.object({
  patientId: z.string().min(1),
  planId: z.string().optional(),
  title: z.string().trim().min(2),
  weekLabel: z.string().trim().optional(),
  imageUrl: z.string().trim().optional(),
  notes: z.string().trim().optional(),
  isPublished: z.boolean(),
  days: z.array(weeklyDaySchema).min(1),
});
