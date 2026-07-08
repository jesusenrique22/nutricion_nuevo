"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { assertBookingRequestAllowed } from "@/lib/booking-guard";
import { prisma } from "@/server/db/prisma";
import { getPaymentCheckoutPolicy } from "@/lib/payment-checkout-policy";
import { findProductById } from "@/lib/products-parse";
import { getProductPrimaryImage } from "@/lib/product-images";
import { getProducts } from "@/server/queries/landing.queries";
import { createNotification } from "@/server/services/notification.service";
import { validateAppointmentSlot } from "@/server/services/scheduling.service";
import { fulfillCartCheckout, findReusableCartAppointment } from "@/server/services/cart-checkout.service";
import { formatActionError } from "@/lib/db-errors";
import { modalityLabels } from "@/lib/appointment-labels";

export type CartActionResult =
  | { ok: true }
  | { ok: false; message: string };

export interface CartItemDTO {
  id: string;
  type: "RESOURCE" | "APPOINTMENT" | "PRODUCT";
  title: string;
  subtitle: string;
  /** Precio unitario */
  price: string | null;
  currency?: string;
  quantity: number;
  imageUrl?: string | null;
  resourceId?: string;
  productId?: string;
  consultationTypeId?: string;
  appointmentStart?: string;
  modality?: string;
}

async function requirePatient() {
  const session = await auth();
  if (!session?.user?.id || session.user.role !== "PATIENT") return null;
  return session;
}

function formatAppointmentSubtitle(
  start: Date,
  modality: string | null | undefined,
) {
  const when = start.toLocaleString("es", {
    weekday: "short",
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
  const mod =
    modality && modality in modalityLabels
      ? modalityLabels[modality as keyof typeof modalityLabels]
      : modality;
  return mod ? `${when} · ${mod}` : when;
}

export async function getCartItems(): Promise<CartItemDTO[]> {
  try {
    const session = await requirePatient();
    if (!session) return [];

    const items = await prisma.cartItem.findMany({
      where: { userId: session.user.id },
      include: { resource: true, consultationType: true },
      orderBy: { createdAt: "asc" },
    });

    const productsCatalog =
      items.some((item) => item.type === "PRODUCT")
        ? await getProducts()
        : null;

    const result: CartItemDTO[] = [];
    for (const item of items) {
      if (item.type === "RESOURCE" && item.resource) {
        result.push({
          id: item.id,
          type: "RESOURCE",
          title: item.resource.title,
          subtitle: item.resource.type,
          price: item.resource.price.toString(),
          currency: item.resource.currency,
          quantity: item.quantity ?? 1,
          imageUrl: item.resource.coverUrl,
          resourceId: item.resourceId ?? undefined,
        });
        continue;
      }
      if (item.type === "PRODUCT" && item.productId && productsCatalog) {
        const product = findProductById(productsCatalog, item.productId);
        if (!product) continue;
        const category = productsCatalog.categories.find(
          (c) => c.id === product.categoryId,
        );
        const primary = getProductPrimaryImage(product);
        result.push({
          id: item.id,
          type: "PRODUCT",
          title: product.name,
          subtitle: category?.label ?? "Producto",
          price: product.price.toString(),
          currency: product.currency,
          quantity: item.quantity ?? 1,
          imageUrl: primary?.src ?? null,
          productId: item.productId,
        });
        continue;
      }
      if (item.type === "APPOINTMENT") {
        result.push({
          id: item.id,
          type: "APPOINTMENT",
          title: item.consultationType?.name ?? "Consulta",
          subtitle: item.appointmentStart
            ? formatAppointmentSubtitle(
                item.appointmentStart,
                item.modality,
              )
            : "",
          price: item.consultationType?.price.toString() ?? null,
          currency: "ARS",
          quantity: 1,
          imageUrl: item.consultationType?.imageUrl ?? null,
          consultationTypeId: item.consultationTypeId ?? undefined,
          appointmentStart: item.appointmentStart?.toISOString(),
          modality: item.modality ?? undefined,
        });
      }
    }
    return result;
  } catch {
    return [];
  }
}

export async function getCartCount(): Promise<number> {
  try {
    const session = await requirePatient();
    if (!session) return 0;

    if ("cartItem" in prisma && prisma.cartItem) {
      const items = await prisma.cartItem.findMany({
        where: { userId: session.user.id },
        select: { quantity: true },
      });
      return items.reduce((sum, row) => sum + (row.quantity ?? 1), 0);
    }

    const rows = await prisma.$queryRaw<{ count: bigint }[]>`
      SELECT COUNT(*)::bigint AS count FROM "CartItem" WHERE "userId" = ${session.user.id}
    `;
    return Number(rows[0]?.count ?? 0);
  } catch {
    return 0;
  }
}

export async function addResourceToCart(
  resourceId: string,
): Promise<CartActionResult> {
  const session = await requirePatient();
  if (!session) return { ok: false, message: "Debes iniciar sesión." };

  const resource = await prisma.resource.findFirst({
    where: { id: resourceId, isPublished: true },
  });
  if (!resource) return { ok: false, message: "Recurso no disponible." };

  const granted = await prisma.resourcePurchase.findFirst({
    where: {
      userId: session.user.id,
      resourceId,
      status: "GRANTED",
    },
  });
  if (granted) {
    return { ok: false, message: "Ya tienes acceso a este recurso." };
  }

  await prisma.cartItem.upsert({
    where: {
      userId_resourceId: { userId: session.user.id, resourceId },
    },
    create: { userId: session.user.id, type: "RESOURCE", resourceId },
    update: {},
  });

  revalidatePath("/dashboard/patient/cart");
  revalidatePath("/dashboard/patient/library");
  return { ok: true };
}

export async function addProductToCart(
  productId: string,
): Promise<CartActionResult> {
  const session = await requirePatient();
  if (!session) return { ok: false, message: "Debes iniciar sesión." };

  const catalog = await getProducts();
  const product = findProductById(catalog, productId);
  if (!product) return { ok: false, message: "Producto no disponible." };

  const existing = await prisma.productPurchase.findUnique({
    where: {
      userId_productId: { userId: session.user.id, productId },
    },
  });
  if (existing?.status === "GRANTED") {
    return { ok: false, message: "Ya compraste este producto." };
  }
  if (existing?.status === "PENDING") {
    return {
      ok: false,
      message: "Ya tenés una solicitud de compra pendiente para este producto.",
    };
  }

  await prisma.cartItem.upsert({
    where: {
      userId_productId: { userId: session.user.id, productId },
    },
    create: {
      userId: session.user.id,
      type: "PRODUCT",
      productId,
      quantity: 1,
    },
    update: { quantity: { increment: 1 } },
  });

  revalidatePath("/dashboard/patient/cart");
  revalidatePath("/dashboard/patient/products");
  revalidatePath("/productos");
  return { ok: true };
}

export async function getMyProductPurchaseStatuses(): Promise<
  Record<string, "PENDING" | "GRANTED">
> {
  const session = await requirePatient();
  if (!session) return {};

  const rows = await prisma.productPurchase.findMany({
    where: { userId: session.user.id },
    select: { productId: true, status: true },
  });

  const map: Record<string, "PENDING" | "GRANTED"> = {};
  for (const row of rows) {
    if (row.status === "PENDING" || row.status === "GRANTED") {
      map[row.productId] = row.status;
    }
  }
  return map;
}

export async function addAppointmentToCart(params: {
  consultationTypeId: string;
  startTime: string;
  modality: "ONLINE" | "PRESENCIAL";
  recaptchaToken?: string;
}): Promise<CartActionResult> {
  const session = await requirePatient();
  if (!session) return { ok: false, message: "Debes iniciar sesión." };

  const guard = await assertBookingRequestAllowed(
    session.user.id,
    params.recaptchaToken,
  );
  if (!guard.ok) return guard;

  const consultationType = await prisma.consultationType.findUnique({
    where: { id: params.consultationTypeId },
  });
  if (!consultationType) {
    return { ok: false, message: "Tipo de consulta no encontrado." };
  }

  const startTime = new Date(params.startTime);
  const validation = await validateAppointmentSlot({
    consultationType,
    startTime,
    modality: params.modality,
  });
  if (!validation.ok) {
    return { ok: false, message: validation.message };
  }

  const duplicate = await prisma.cartItem.findFirst({
    where: {
      userId: session.user.id,
      type: "APPOINTMENT",
      consultationTypeId: params.consultationTypeId,
      appointmentStart: startTime,
    },
  });
  if (duplicate) {
    return { ok: false, message: "Esta cita ya está en tu carrito." };
  }

  await prisma.cartItem.create({
    data: {
      userId: session.user.id,
      type: "APPOINTMENT",
      consultationTypeId: params.consultationTypeId,
      appointmentStart: startTime,
      modality: params.modality,
    },
  });

  revalidatePath("/dashboard/patient/cart");
  revalidatePath("/dashboard/patient/appointments");
  return { ok: true };
}

export async function updateCartItemQuantity(
  itemId: string,
  quantity: number,
): Promise<CartActionResult> {
  const session = await requirePatient();
  if (!session) return { ok: false, message: "No autorizado." };

  const item = await prisma.cartItem.findFirst({
    where: { id: itemId, userId: session.user.id },
  });
  if (!item) return { ok: false, message: "Ítem no encontrado." };
  if (item.type !== "PRODUCT") {
    return { ok: false, message: "Solo los productos admiten cantidad." };
  }

  const nextQty = Math.floor(quantity);
  if (nextQty < 1) {
    await prisma.cartItem.delete({ where: { id: itemId } });
  } else if (nextQty > 99) {
    return { ok: false, message: "Máximo 99 unidades por producto." };
  } else {
    await prisma.cartItem.update({
      where: { id: itemId },
      data: { quantity: nextQty },
    });
  }

  revalidatePath("/dashboard/patient/cart");
  return { ok: true };
}

export async function removeCartItem(itemId: string): Promise<CartActionResult> {
  const session = await requirePatient();
  if (!session) return { ok: false, message: "No autorizado." };

  await prisma.cartItem.deleteMany({
    where: { id: itemId, userId: session.user.id },
  });

  revalidatePath("/dashboard/patient/cart");
  return { ok: true };
}

export async function submitCart(options?: {
  paymentMethod?: string;
  paymentReference?: string;
  paymentProofUrls?: string[];
  paymentNote?: string;
}): Promise<CartActionResult> {
  try {
    const session = await requirePatient();
    if (!session) return { ok: false, message: "No autorizado." };

    const items = await prisma.cartItem.findMany({
      where: { userId: session.user.id },
      include: { resource: true, consultationType: true },
    });
    if (items.length === 0) {
      return { ok: false, message: "Tu carrito está vacío." };
    }

    const productsCatalog = items.some((i) => i.type === "PRODUCT")
      ? await getProducts()
      : null;

    const productItems = items
      .filter(
        (item): item is typeof item & { productId: string } =>
          item.type === "PRODUCT" && !!item.productId,
      )
      .map((item) => {
        const product = productsCatalog
          ? findProductById(productsCatalog, item.productId)
          : null;
        if (!product) {
          throw new Error("PRODUCT_UNAVAILABLE");
        }
        return {
          productId: item.productId,
          product,
          quantity: item.quantity ?? 1,
        };
      });

    const requiresPayment =
      items.some(
        (i) =>
          (i.type === "RESOURCE" && i.resource && i.resource.price.toNumber() > 0) ||
          (i.type === "APPOINTMENT" &&
            i.consultationType &&
            i.consultationType.price.toNumber() > 0),
      ) || productItems.some((item) => item.product.price * (item.quantity ?? 1) > 0);

    if (requiresPayment) {
      const policy = await getPaymentCheckoutPolicy();
      if (!options?.paymentMethod) {
        return { ok: false, message: "Selecciona un modo de pago." };
      }
      if (!options?.paymentReference?.trim()) {
        return {
          ok: false,
          message: `Indica ${policy.referenceLabel.toLowerCase()}.`,
        };
      }
      const proofs = options?.paymentProofUrls ?? [];
      if (proofs.length === 0) {
        return {
          ok: false,
          message: "Sube la captura del comprobante de pago.",
        };
      }
      if (proofs.length > policy.maxProofFiles) {
        return {
          ok: false,
          message: "Solo se permite una captura por pedido.",
        };
      }
    }

    const paymentPayload = requiresPayment
      ? {
          patientPaymentMethod: options!.paymentMethod!,
          patientPaymentReference: options!.paymentReference?.trim() ?? null,
          patientPaymentNote: options!.paymentNote?.trim() ?? null,
          patientPaymentProofUrls: options!.paymentProofUrls ?? [],
        }
      : null;

    const appointmentItems = items.filter(
      (
        item,
      ): item is typeof item & {
        consultationType: NonNullable<typeof item.consultationType>;
        appointmentStart: Date;
        modality: NonNullable<typeof item.modality>;
      } =>
        item.type === "APPOINTMENT" &&
        !!item.consultationType &&
        !!item.appointmentStart &&
        !!item.modality,
    );

    const resourceItems = items.filter(
      (
        item,
      ): item is typeof item & {
        resource: NonNullable<typeof item.resource>;
        resourceId: string;
      } => item.type === "RESOURCE" && !!item.resource && !!item.resourceId,
    );

    for (const item of appointmentItems) {
      const reusable = await findReusableCartAppointment({
        patientId: session.user.id,
        consultationTypeId: item.consultationTypeId!,
        startTime: item.appointmentStart,
      });

      const validation = await validateAppointmentSlot({
        consultationType: item.consultationType,
        startTime: item.appointmentStart,
        modality: item.modality,
        excludeAppointmentId: reusable?.id,
      });
      if (!validation.ok) {
        return {
          ok: false,
          message: `${item.consultationType.name}: ${validation.message}`,
        };
      }
    }

    const result = await fulfillCartCheckout({
      patientId: session.user.id,
      patientName: session.user.name ?? "Paciente",
      appointmentItems: appointmentItems.map((item) => ({
        consultationTypeId: item.consultationTypeId!,
        appointmentStart: item.appointmentStart,
        modality: item.modality,
        consultationType: item.consultationType,
      })),
      resourceItems: resourceItems.map((item) => ({
        resourceId: item.resourceId,
        resource: item.resource,
      })),
      productItems,
      paymentPayload,
    });

    if (!result.ok) {
      return { ok: false, message: result.message };
    }

    for (const item of resourceItems) {
      if (item.resource.price.toNumber() === 0) {
        try {
          await createNotification({
            recipientId: session.user.id,
            type: "RESOURCE_UNLOCKED",
            title: "Recurso desbloqueado",
            body: `Ya puedes ver «${item.resource.title}».`,
            payload: {
              resourceId: item.resourceId,
              deepLink: `/dashboard/patient/library/${item.resourceId}`,
            },
          });
        } catch {
          // MongoDB opcional
        }
      }
    }

    revalidatePath("/dashboard/patient/cart");
    revalidatePath("/dashboard/patient/appointments");
    revalidatePath("/dashboard/patient/library");
    revalidatePath("/dashboard/patient/products");
    revalidatePath("/dashboard/patient/progress");
    revalidatePath("/dashboard/notifications");
    revalidatePath("/dashboard/admin/payments");
    return { ok: true };
  } catch (err) {
    if (err instanceof Error && err.message === "PRODUCT_UNAVAILABLE") {
      return {
        ok: false,
        message: "Uno de los productos ya no está disponible. Actualizá el carrito.",
      };
    }
    console.error("[submitCart]", err);
    return {
      ok: false,
      message: formatActionError(err, "No se pudo confirmar el pedido. Intentá de nuevo."),
    };
  }
}
