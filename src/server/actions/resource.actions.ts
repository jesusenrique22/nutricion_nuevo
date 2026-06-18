"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { prisma } from "@/server/db/prisma";
import {
  grantResourceSchema,
  upsertResourceSchema,
} from "@/lib/validators/resource";
import { createNotification } from "@/server/actions/notification.actions";
import { syncUser } from "@/server/realtime/sync";
import { formatActionError } from "@/lib/db-errors";

export type ResourceActionResult =
  | { ok: true; id?: string }
  | { ok: false; message: string };

async function requireAdmin() {
  const session = await auth();
  if (session?.user?.role !== "ADMIN") return null;
  return session;
}

function revalidateResourcePaths() {
  revalidatePath("/");
  revalidatePath("/resources");
  revalidatePath("/dashboard/admin/resources");
  revalidatePath("/dashboard/admin/payments");
  revalidatePath("/dashboard/patient/library");
  revalidatePath("/dashboard/admin/personalizar");
  revalidatePath("/dashboard/notifications");
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
    try {
      await prisma.resource.update({ where: { id: data.id }, data: payload });
      revalidateResourcePaths();
      return { ok: true, id: data.id };
    } catch (err) {
      console.error("[upsertResource]", err);
      return {
        ok: false,
        message: formatActionError(err, "No se pudo guardar el recurso."),
      };
    }
  }

  try {
    const created = await prisma.resource.create({ data: payload });
    revalidateResourcePaths();
    return { ok: true, id: created.id };
  } catch (err) {
    console.error("[upsertResource]", err);
    return {
      ok: false,
      message: formatActionError(err, "No se pudo crear el recurso."),
    };
  }
}

export async function deleteResource(id: string): Promise<ResourceActionResult> {
  if (!(await requireAdmin())) {
    return { ok: false, message: "No autorizado." };
  }

  const resource = await prisma.resource.findUnique({
    where: { id },
    select: {
      id: true,
      purchases: {
        where: { status: "GRANTED" },
        select: { id: true },
        take: 1,
      },
    },
  });
  if (!resource) {
    return { ok: false, message: "Recurso no encontrado." };
  }

  if (resource.purchases.length > 0) {
    return {
      ok: false,
      message:
        "No se puede eliminar: hay pacientes con acceso activo. Despublícalo para ocultarlo de la tienda.",
    };
  }

  try {
    await prisma.$transaction([
      prisma.cartItem.deleteMany({ where: { resourceId: id } }),
      prisma.resourcePurchase.deleteMany({ where: { resourceId: id } }),
      prisma.resource.delete({ where: { id } }),
    ]);
    revalidateResourcePaths();
    return { ok: true };
  } catch (err) {
    console.error("[deleteResource]", err);
    return {
      ok: false,
      message: formatActionError(err, "No se pudo eliminar el recurso."),
    };
  }
}

export async function toggleResourcePublished(
  id: string,
  isPublished: boolean,
): Promise<ResourceActionResult> {
  if (!(await requireAdmin())) {
    return { ok: false, message: "No autorizado." };
  }

  try {
    await prisma.resource.update({ where: { id }, data: { isPublished } });
    revalidateResourcePaths();
    return { ok: true };
  } catch (err) {
    console.error("[toggleResourcePublished]", err);
    return {
      ok: false,
      message: formatActionError(err, "No se pudo cambiar la publicación."),
    };
  }
}

/** Admin desbloquea recurso tras verificar pago. */
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

  try {
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
        status: "GRANTED",
        grantedAt: new Date(),
        adminNote: parsed.data.adminNote ?? null,
        inboxTrashedAt: null,
        inboxDismissedAt: null,
      },
      update: {
        status: "GRANTED",
        grantedAt: new Date(),
        adminNote: parsed.data.adminNote ?? null,
        inboxTrashedAt: null,
        inboxDismissedAt: null,
      },
    });

    await createNotification({
      _serverOnly: true,
      recipientId: parsed.data.userId,
      type: "RESOURCE_UNLOCKED",
      title: "Recurso desbloqueado",
      body: `Tu acceso a «${resource.title}» ya está activo.`,
      payload: {
        resourceId: resource.id,
        deepLink: `/dashboard/patient/library/${resource.id}`,
      },
    });

    await syncUser(parsed.data.userId, "notifications", { action: "created" });
    revalidateResourcePaths();
    return { ok: true };
  } catch (err) {
    console.error("[grantResourceAccess]", err);
    return {
      ok: false,
      message: formatActionError(err, "No se pudo desbloquear el recurso."),
    };
  }
}

/** Paciente agrega recurso al carrito para solicitar acceso. */
export async function requestResourceAccess(
  resourceId: string,
): Promise<ResourceActionResult> {
  const { addResourceToCart } = await import("@/server/actions/cart.actions");
  const res = await addResourceToCart(resourceId);
  if (!res.ok) return res;
  return { ok: true };
}
