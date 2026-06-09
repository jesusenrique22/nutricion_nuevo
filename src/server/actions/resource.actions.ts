"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { prisma } from "@/server/db/prisma";
import {
  grantResourceSchema,
  upsertResourceSchema,
} from "@/lib/validators/resource";

export type ResourceActionResult =
  | { ok: true; id?: string }
  | { ok: false; message: string };

async function requireAdmin() {
  const session = await auth();
  if (session?.user?.role !== "ADMIN") return null;
  return session;
}

function revalidateResourcePaths() {
  revalidatePath("/resources");
  revalidatePath("/dashboard/admin/resources");
  revalidatePath("/dashboard/patient/library");
  revalidatePath("/dashboard/admin/personalizar");
}

export async function upsertResource(
  formData: unknown,
): Promise<ResourceActionResult> {
  if (!(await requireAdmin())) {
    return { ok: false, message: "No autorizado." };
  }

  const parsed = upsertResourceSchema.safeParse(formData);
  if (!parsed.success) {
    return {
      ok: false,
      message: parsed.error.issues[0]?.message ?? "Datos inválidos.",
    };
  }

  const data = parsed.data;
  const payload = {
    title: data.title,
    description: data.description ?? null,
    type: data.type,
    coverUrl: data.coverUrl || null,
    contentUrl: data.contentUrl || null,
    videoUrl: data.videoUrl || null,
    linkUrl: data.linkUrl || null,
    body: data.body ?? null,
    price: data.price,
    currency: data.currency,
    category: data.category ?? null,
    isPublished: data.isPublished ?? false,
    sortOrder: data.sortOrder ?? 0,
  };

  if (data.id) {
    await prisma.resource.update({ where: { id: data.id }, data: payload });
    revalidateResourcePaths();
    return { ok: true, id: data.id };
  }

  const created = await prisma.resource.create({ data: payload });
  revalidateResourcePaths();
  return { ok: true, id: created.id };
}

export async function deleteResource(id: string): Promise<ResourceActionResult> {
  if (!(await requireAdmin())) {
    return { ok: false, message: "No autorizado." };
  }

  await prisma.resource.delete({ where: { id } });
  revalidateResourcePaths();
  return { ok: true };
}

export async function toggleResourcePublished(
  id: string,
  isPublished: boolean,
): Promise<ResourceActionResult> {
  if (!(await requireAdmin())) {
    return { ok: false, message: "No autorizado." };
  }

  await prisma.resource.update({ where: { id }, data: { isPublished } });
  revalidateResourcePaths();
  return { ok: true };
}

/** Admin otorga acceso manual (sin pasarela). */
export async function grantResourceAccess(
  formData: unknown,
): Promise<ResourceActionResult> {
  if (!(await requireAdmin())) {
    return { ok: false, message: "No autorizado." };
  }

  const parsed = grantResourceSchema.safeParse(formData);
  if (!parsed.success) {
    return { ok: false, message: "Datos inválidos." };
  }

  const resource = await prisma.resource.findUnique({
    where: { id: parsed.data.resourceId },
  });
  if (!resource) return { ok: false, message: "Recurso no encontrado." };

  await prisma.resourcePurchase.upsert({
    where: {
      userId_resourceId: {
        userId: parsed.data.userId,
        resourceId: parsed.data.resourceId,
      },
    },
    create: {
      userId: parsed.data.userId,
      resourceId: parsed.data.resourceId,
      pricePaid: resource.price,
    },
    update: {},
  });

  revalidateResourcePaths();
  return { ok: true };
}

/** Paciente solicita acceso — queda pendiente de pago manual o grant admin. */
export async function requestResourceAccess(
  resourceId: string,
): Promise<ResourceActionResult> {
  const session = await auth();
  if (!session?.user?.id) {
    return { ok: false, message: "Debes iniciar sesión." };
  }

  const resource = await prisma.resource.findFirst({
    where: { id: resourceId, isPublished: true },
  });
  if (!resource) return { ok: false, message: "Recurso no disponible." };

  if (resource.price.toNumber() === 0) {
    await prisma.resourcePurchase.upsert({
      where: {
        userId_resourceId: {
          userId: session.user.id,
          resourceId,
        },
      },
      create: {
        userId: session.user.id,
        resourceId,
        pricePaid: 0,
      },
      update: {},
    });
    revalidateResourcePaths();
    return { ok: true };
  }

  return {
    ok: false,
    message:
      "Contacta a tu nutricionista para completar el pago y activar el acceso.",
  };
}
