"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { prisma } from "@/server/db/prisma";
import { Prisma } from "@prisma/client";
import {
  updateConsultationPriceSchema,
  updateFormTemplateSchema,
  updateSiteContentSchema,
} from "@/lib/validators/cms";
import { DEFAULT_FORM_TEMPLATES } from "@/lib/form-templates-catalog";
import { SITE_CONTENT_DEFAULTS } from "@/lib/form-templates-defaults";
import type { FormFieldDefinition } from "@/types/form-template";

export type CmsActionResult =
  | { ok: true }
  | { ok: false; message: string };

async function requireAdmin() {
  const session = await auth();
  if (session?.user?.role !== "ADMIN") return null;
  return session;
}

export interface ConsultationAdminDTO {
  id: string;
  code: string;
  name: string;
  description: string | null;
  price: string;
  durationMinutes: number;
}

export async function getConsultationTypesAdmin(): Promise<
  ConsultationAdminDTO[]
> {
  if (!(await requireAdmin())) return [];

  const types = await prisma.consultationType.findMany({
    orderBy: { code: "asc" },
  });

  return types.map((t) => ({
    id: t.id,
    code: t.code,
    name: t.name,
    description: t.description,
    price: t.price.toString(),
    durationMinutes: t.durationMinutes,
  }));
}

export async function updateConsultationType(
  formData: unknown,
): Promise<CmsActionResult> {
  if (!(await requireAdmin())) {
    return { ok: false, message: "No autorizado." };
  }

  const parsed = updateConsultationPriceSchema.safeParse(formData);
  if (!parsed.success) {
    return {
      ok: false,
      message: parsed.error.issues[0]?.message ?? "Datos inválidos.",
    };
  }

  await prisma.consultationType.update({
    where: { id: parsed.data.id },
    data: {
      name: parsed.data.name,
      description: parsed.data.description ?? null,
      price: parsed.data.price,
      durationMinutes: parsed.data.durationMinutes,
    },
  });

  revalidatePath("/dashboard/admin/personalizar");
  revalidatePath("/");
  revalidatePath("/dashboard/patient/appointments");
  return { ok: true };
}

export interface SiteContentDTO {
  slug: string;
  title: string | null;
  data: Record<string, unknown>;
}

export async function getSiteContents(): Promise<SiteContentDTO[]> {
  const rows = await prisma.siteContent.findMany({ orderBy: { slug: "asc" } });

  if (rows.length === 0) {
    return Object.entries(SITE_CONTENT_DEFAULTS).map(([slug, v]) => ({
      slug,
      title: v.title,
      data: v.data,
    }));
  }

  return rows.map((r) => ({
    slug: r.slug,
    title: r.title,
    data: r.data as Record<string, unknown>,
  }));
}

export async function getSiteContentBySlug(
  slug: string,
): Promise<SiteContentDTO | null> {
  const row = await prisma.siteContent.findUnique({ where: { slug } });
  if (row) {
    return {
      slug: row.slug,
      title: row.title,
      data: row.data as Record<string, unknown>,
    };
  }

  const defaults = SITE_CONTENT_DEFAULTS[slug];
  if (!defaults) return null;

  return { slug, title: defaults.title, data: defaults.data };
}

export async function updateSiteContent(
  formData: unknown,
): Promise<CmsActionResult> {
  if (!(await requireAdmin())) {
    return { ok: false, message: "No autorizado." };
  }

  const parsed = updateSiteContentSchema.safeParse(formData);
  if (!parsed.success) {
    return { ok: false, message: "Datos inválidos." };
  }

  await prisma.siteContent.upsert({
    where: { slug: parsed.data.slug },
    create: {
      slug: parsed.data.slug,
      title: parsed.data.title ?? null,
      data: parsed.data.data as Prisma.InputJsonValue,
    },
    update: {
      title: parsed.data.title ?? null,
      data: parsed.data.data as Prisma.InputJsonValue,
    },
  });

  revalidatePath("/");
  revalidatePath("/dashboard/admin/personalizar");
  return { ok: true };
}

export interface FormTemplateDTO {
  code: string;
  name: string;
  fields: FormFieldDefinition[];
  version: number;
  isActive: boolean;
}

export async function getFormTemplates(): Promise<FormTemplateDTO[]> {
  const rows = await prisma.formTemplate.findMany({
    orderBy: { code: "asc" },
  });
  const byCode = new Map(rows.map((r) => [r.code, r]));

  return Object.entries(DEFAULT_FORM_TEMPLATES).map(([code, defaults]) => {
    const row = byCode.get(code);
    if (row) {
      return {
        code: row.code,
        name: row.name,
        fields: row.fields as unknown as FormFieldDefinition[],
        version: row.version,
        isActive: row.isActive,
      };
    }
    return {
      code,
      name: defaults.name,
      fields: defaults.fields,
      version: 1,
      isActive: true,
    };
  });
}

export async function getFormTemplateByCode(
  code: string,
): Promise<FormTemplateDTO | null> {
  const row = await prisma.formTemplate.findUnique({ where: { code } });
  if (row) {
    return {
      code: row.code,
      name: row.name,
      fields: row.fields as unknown as FormFieldDefinition[],
      version: row.version,
      isActive: row.isActive,
    };
  }

  const defaults = DEFAULT_FORM_TEMPLATES[code];
  if (!defaults) return null;

  return {
    code,
    name: defaults.name,
    fields: defaults.fields,
    version: 1,
    isActive: true,
  };
}

export async function updateFormTemplate(
  formData: unknown,
): Promise<CmsActionResult> {
  if (!(await requireAdmin())) {
    return { ok: false, message: "No autorizado." };
  }

  const parsed = updateFormTemplateSchema.safeParse(formData);
  if (!parsed.success) {
    return {
      ok: false,
      message: parsed.error.issues[0]?.message ?? "Datos inválidos.",
    };
  }

  const existing = await prisma.formTemplate.findUnique({
    where: { code: parsed.data.code },
  });

  await prisma.formTemplate.upsert({
    where: { code: parsed.data.code },
    create: {
      code: parsed.data.code,
      name: parsed.data.name,
      fields: parsed.data.fields as unknown as Prisma.InputJsonValue,
      version: 1,
    },
    update: {
      name: parsed.data.name,
      fields: parsed.data.fields as unknown as Prisma.InputJsonValue,
      version: (existing?.version ?? 0) + 1,
    },
  });

  revalidatePath("/dashboard/admin/personalizar");
  return { ok: true };
}
