"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { prisma } from "@/server/db/prisma";
import { Prisma } from "@prisma/client";
import {
  createConsultationTypeSchema,
  updateConsultationPriceSchema,
  updateFormTemplateSchema,
  updateSiteContentSchema,
  nutricionistaPageSchema,
  paymentChatPolicySchema,
} from "@/lib/validators/cms";
import { paymentCheckoutPolicySchema } from "@/lib/validators/payment-checkout";
import {
  paymentCheckoutPolicyToRecord,
  parsePaymentCheckoutPolicy,
} from "@/lib/payment-checkout-policy";
import { PAYMENT_CHECKOUT_POLICY_SLUG } from "@/types/payment-checkout-policy";
import {
  paymentChatPolicyToRecord,
  parsePaymentChatPolicy,
} from "@/lib/payment-chat-policy";
import { PAYMENT_CHAT_POLICY_SLUG } from "@/types/payment-chat-policy";
import { DEFAULT_FORM_TEMPLATES } from "@/lib/form-templates-catalog";
import { SITE_CONTENT_DEFAULTS } from "@/lib/form-templates-defaults";
import { areFormsEnabled, withoutChatUnlock } from "@/lib/feature-flags";
import { nutricionistaPageToRecord } from "@/lib/nutricionista-cv-parse";
import { NUTRICIONISTA_PAGE_SLUG } from "@/types/nutricionista-cv";
import type { NutricionistaPageData } from "@/types/nutricionista-cv";
import type { FormFieldDefinition } from "@/types/form-template";
import { formatActionError } from "@/lib/db-errors";

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
  isPublished: boolean;
  sortOrder: number;
  imageUrl: string | null;
  allowsOnline: boolean;
  allowsPresencial: boolean;
  morningOnly: boolean;
}

export async function getConsultationTypesAdmin(): Promise<
  ConsultationAdminDTO[]
> {
  if (!(await requireAdmin())) return [];

  const types = await prisma.consultationType.findMany({
    orderBy: [{ sortOrder: "asc" }, { code: "asc" }],
  });

  return types.map((t) => ({
    id: t.id,
    code: t.code,
    name: t.name,
    description: t.description,
    price: t.price.toString(),
    durationMinutes: t.durationMinutes,
    isPublished: t.isPublished,
    sortOrder: t.sortOrder,
    imageUrl: t.imageUrl,
    allowsOnline: t.allowsOnline,
    allowsPresencial: t.allowsPresencial,
    morningOnly: t.morningOnly,
  }));
}

async function nextConsultationCode(): Promise<string> {
  const existing = await prisma.consultationType.findMany({
    select: { code: true },
  });
  let max = 3;
  for (const row of existing) {
    const match = row.code.match(/^PKG_(\d+)$/i);
    if (match) max = Math.max(max, Number(match[1]));
  }
  return `PKG_${String(max + 1).padStart(2, "0")}`;
}

export async function createConsultationType(
  formData: unknown,
): Promise<CmsActionResult & { code?: string }> {
  if (!(await requireAdmin())) {
    return { ok: false, message: "No autorizado." };
  }

  const parsed = createConsultationTypeSchema.safeParse(formData);
  if (!parsed.success) {
    return {
      ok: false,
      message: parsed.error.issues[0]?.message ?? "Datos inválidos.",
    };
  }

  const maxSort = await prisma.consultationType.aggregate({
    _max: { sortOrder: true },
  });

  const code = await nextConsultationCode();
  await prisma.consultationType.create({
    data: {
      code,
      name: parsed.data.name,
      description: parsed.data.description ?? null,
      price: parsed.data.price,
      durationMinutes: parsed.data.durationMinutes,
      allowsOnline: parsed.data.allowsOnline ?? true,
      allowsPresencial: parsed.data.allowsPresencial ?? true,
      morningOnly: parsed.data.morningOnly ?? false,
      imageUrl: parsed.data.imageUrl ?? null,
      isPublished: true,
      sortOrder: (maxSort._max.sortOrder ?? 0) + 1,
    },
  });

  revalidatePath("/dashboard/admin/precios-pagos");
  revalidatePath("/");
  return { ok: true, code };
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
      ...(parsed.data.isPublished !== undefined && {
        isPublished: parsed.data.isPublished,
      }),
      ...(parsed.data.sortOrder !== undefined && {
        sortOrder: parsed.data.sortOrder,
      }),
      ...(parsed.data.imageUrl !== undefined && {
        imageUrl: parsed.data.imageUrl || null,
      }),
      ...(parsed.data.allowsOnline !== undefined && {
        allowsOnline: parsed.data.allowsOnline,
      }),
      ...(parsed.data.allowsPresencial !== undefined && {
        allowsPresencial: parsed.data.allowsPresencial,
      }),
      ...(parsed.data.morningOnly !== undefined && {
        morningOnly: parsed.data.morningOnly,
      }),
    },
  });

  revalidatePath("/dashboard/admin/precios-pagos");
  revalidatePath("/dashboard/admin/personalizar");
  revalidatePath("/");
  revalidatePath("/dashboard/patient/appointments");
  return { ok: true };
}

export async function deleteConsultationType(
  id: string,
): Promise<CmsActionResult> {
  if (!(await requireAdmin())) {
    return { ok: false, message: "No autorizado." };
  }

  if (!id?.trim()) {
    return { ok: false, message: "Paquete no válido." };
  }

  const row = await prisma.consultationType.findUnique({
    where: { id },
    select: {
      id: true,
      name: true,
      _count: {
        select: { appointments: true },
      },
    },
  });

  if (!row) {
    return { ok: false, message: "Paquete no encontrado." };
  }

  if (row._count.appointments > 0) {
    return {
      ok: false,
      message: `No se puede eliminar «${row.name}»: tiene ${row._count.appointments} cita(s) vinculada(s). Despublicalo del lobby si ya no lo ofrecés.`,
    };
  }

  try {
    await prisma.$transaction([
      prisma.cartItem.deleteMany({ where: { consultationTypeId: id } }),
      prisma.consultationType.delete({ where: { id } }),
    ]);

    revalidatePath("/dashboard/admin/precios-pagos");
    revalidatePath("/");
    revalidatePath("/dashboard/patient/appointments");
    return { ok: true };
  } catch (err) {
    console.error("[deleteConsultationType]", err);
    return {
      ok: false,
      message: formatActionError(err, "No se pudo eliminar el paquete."),
    };
  }
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

export async function updateNutricionistaPage(
  formData: unknown,
): Promise<CmsActionResult> {
  if (!(await requireAdmin())) {
    return { ok: false, message: "No autorizado." };
  }

  const parsed = nutricionistaPageSchema.safeParse(formData);
  if (!parsed.success) {
    return {
      ok: false,
      message: parsed.error.issues[0]?.message ?? "Datos inválidos.",
    };
  }

  await prisma.siteContent.upsert({
    where: { slug: NUTRICIONISTA_PAGE_SLUG },
    create: {
      slug: NUTRICIONISTA_PAGE_SLUG,
      title: "Sobre mí / CV",
      data: nutricionistaPageToRecord(parsed.data) as Prisma.InputJsonValue,
    },
    update: {
      data: nutricionistaPageToRecord(parsed.data) as Prisma.InputJsonValue,
    },
  });

  revalidatePath("/nutricionista");
  revalidatePath("/nutricionista/especialidad");
  revalidatePath("/dashboard/admin/personalizar");
  return { ok: true };
}

export type NutricionistaPageDTO = NutricionistaPageData;

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

  if (!areFormsEnabled()) {
    return {
      ok: false,
      message: "Los formularios están deshabilitados por el momento.",
    };
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
  revalidatePath("/");
  return { ok: true };
}

export async function getPaymentChatPolicyAdmin() {
  if (!(await requireAdmin())) return parsePaymentChatPolicy(undefined);
  const [row, types] = await Promise.all([
    getSiteContentBySlug(PAYMENT_CHAT_POLICY_SLUG),
    prisma.consultationType.findMany({
      select: { code: true },
      orderBy: [{ sortOrder: "asc" }, { code: "asc" }],
    }),
  ]);
  return parsePaymentChatPolicy(
    row?.data,
    types.map((t) => t.code),
  );
}

export async function updatePaymentChatPolicy(
  formData: unknown,
): Promise<CmsActionResult> {
  if (!(await requireAdmin())) {
    return { ok: false, message: "No autorizado." };
  }

  const parsed = paymentChatPolicySchema.safeParse(formData);
  if (!parsed.success) {
    return {
      ok: false,
      message: parsed.error.issues[0]?.message ?? "Datos inválidos.",
    };
  }

  const policy = withoutChatUnlock(parsed.data);

  await prisma.siteContent.upsert({
    where: { slug: PAYMENT_CHAT_POLICY_SLUG },
    create: {
      slug: PAYMENT_CHAT_POLICY_SLUG,
      title: "Política de pagos",
      data: paymentChatPolicyToRecord(policy) as Prisma.InputJsonValue,
    },
    update: {
      data: paymentChatPolicyToRecord(policy) as Prisma.InputJsonValue,
    },
  });

  revalidatePath("/dashboard/admin/personalizar");
  revalidatePath("/dashboard/admin/precios-pagos");
  revalidatePath("/dashboard/patient/appointments");
  return { ok: true };
}

export async function getPaymentCheckoutPolicyAdmin() {
  if (!(await requireAdmin())) return parsePaymentCheckoutPolicy(undefined);
  const row = await getSiteContentBySlug(PAYMENT_CHECKOUT_POLICY_SLUG);
  return parsePaymentCheckoutPolicy(row?.data as Record<string, unknown>);
}

export async function updatePaymentCheckoutPolicy(
  formData: unknown,
): Promise<CmsActionResult> {
  if (!(await requireAdmin())) {
    return { ok: false, message: "No autorizado." };
  }

  const parsed = paymentCheckoutPolicySchema.safeParse(formData);
  if (!parsed.success) {
    return {
      ok: false,
      message: parsed.error.issues[0]?.message ?? "Datos inválidos.",
    };
  }

  await prisma.siteContent.upsert({
    where: { slug: PAYMENT_CHECKOUT_POLICY_SLUG },
    create: {
      slug: PAYMENT_CHECKOUT_POLICY_SLUG,
      title: "Checkout y comprobantes de pago",
      data: paymentCheckoutPolicyToRecord(parsed.data) as Prisma.InputJsonValue,
    },
    update: {
      data: paymentCheckoutPolicyToRecord(parsed.data) as Prisma.InputJsonValue,
    },
  });

  revalidatePath("/dashboard/admin/personalizar");
  revalidatePath("/dashboard/patient/cart");
  revalidatePath("/dashboard/admin/payments");
  return { ok: true };
}
