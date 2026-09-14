/**
 * Notificaciones del ciclo de vida de una compra (recursos y productos):
 * pedido recibido → en revisión → aprobado / rechazado.
 * NO usar "use server": es un servicio interno.
 */
import {
  getAdminNotificationEmails,
  getAdminUserIds,
} from "@/lib/admin-users";
import { absoluteUrl, isEmailDeliveryConfigured, sendEmail } from "@/lib/email";
import { prisma } from "@/server/db/prisma";
import { createNotification } from "@/server/services/notification.service";

export type PurchaseItemKind = "RESOURCE" | "PRODUCT";

/** Estados visibles para el paciente. */
export type PurchaseStage = "SUBMITTED" | "IN_REVIEW" | "APPROVED" | "REJECTED";

export const purchaseStageLabels: Record<PurchaseStage, string> = {
  SUBMITTED: "Pedido recibido",
  IN_REVIEW: "Pago en revisión",
  APPROVED: "Pagado y disponible",
  REJECTED: "Pago rechazado",
};

async function safeNotify(fn: () => Promise<void>): Promise<void> {
  try {
    await fn();
  } catch (err) {
    console.error("[purchase-notify] Error en notificación:", err);
  }
}

function emailShell(params: {
  heading: string;
  accent: string;
  background: string;
  intro: string;
  rows: string[];
  note?: string;
  ctaLabel: string;
  ctaHref: string;
}) {
  return `
    <div style="font-family:sans-serif;max-width:480px;margin:0 auto;color:#1a1a1a">
      <p style="font-size:12px;letter-spacing:0.2em;text-transform:uppercase;color:#888">Anttova Nutrición</p>
      <h1 style="font-size:20px;font-weight:600;color:${params.accent}">${params.heading}</h1>
      <p>${params.intro}</p>
      <div style="background:${params.background};border-left:4px solid ${params.accent};padding:16px;margin:20px 0;border-radius:4px">
        ${params.rows.map((row) => `<p style="margin:4px 0">${row}</p>`).join("")}
      </div>
      ${params.note ? `<p style="font-size:14px;color:#555">${params.note}</p>` : ""}
      <p style="margin:24px 0">
        <a href="${params.ctaHref}" style="background:${params.accent};color:#fff;padding:12px 24px;border-radius:999px;text-decoration:none;font-weight:600;display:inline-block">
          ${params.ctaLabel}
        </a>
      </p>
    </div>
  `;
}

function libraryLink(kind: PurchaseItemKind) {
  return kind === "RESOURCE"
    ? "/dashboard/patient/library"
    : "/dashboard/patient/products";
}

/**
 * Pedido enviado al checkout: avisa al paciente que la compra quedó registrada
 * y en qué estado está, y alerta a los admins de que hay un pago por revisar.
 */
export async function notifyPurchaseSubmitted(params: {
  patientId: string;
  patientName: string;
  /** Ítems pagos que quedaron pendientes de aprobación. */
  pendingItems: { title: string; kind: PurchaseItemKind }[];
  /** Ítems que quedaron disponibles al instante (precio 0). */
  grantedItems?: { title: string; kind: PurchaseItemKind }[];
}) {
  const pending = params.pendingItems;
  if (pending.length === 0) return;

  await safeNotify(async () => {
    const titles = pending.map((i) => i.title);
    const itemsList = titles.join(", ");
    const hasResource = pending.some((i) => i.kind === "RESOURCE");
    const deepLink = libraryLink(hasResource ? "RESOURCE" : "PRODUCT");

    await createNotification({
      recipientId: params.patientId,
      type: "PURCHASE_STATUS",
      title: `Compra en proceso · ${purchaseStageLabels.IN_REVIEW}`,
      body:
        titles.length === 1
          ? `Registramos tu compra de «${titles[0]}». Estamos verificando el pago y te avisamos al aprobarlo.`
          : `Registramos tu compra de ${titles.length} ítems (${itemsList}). Estamos verificando el pago y te avisamos al aprobarlo.`,
      payload: {
        deepLink,
        stage: "IN_REVIEW",
        items: titles,
      },
    });

    const adminIds = await getAdminUserIds();
    await Promise.all(
      adminIds.map((id) =>
        createNotification({
          recipientId: id,
          type: "PURCHASE_STATUS",
          title: "Nueva compra por aprobar",
          body: `${params.patientName} compró ${itemsList}. Revisá el comprobante para habilitar el acceso.`,
          payload: {
            deepLink: "/dashboard/admin/payments",
            patientId: params.patientId,
            items: titles,
          },
        }),
      ),
    );

    if (!isEmailDeliveryConfigured()) return;

    const user = await prisma.user.findUnique({
      where: { id: params.patientId },
      select: { email: true, name: true },
    });

    if (user?.email) {
      const patientName = user.name || params.patientName || "Estimado/a";
      const rows = [
        `<strong>Ítems:</strong> ${itemsList}`,
        `<strong>Estado actual:</strong> ${purchaseStageLabels.IN_REVIEW}`,
      ];
      if (params.grantedItems?.length) {
        rows.push(
          `<strong>Ya disponibles:</strong> ${params.grantedItems.map((i) => i.title).join(", ")}`,
        );
      }

      await sendEmail({
        to: user.email,
        subject: "Anttova — Recibimos tu compra",
        html: emailShell({
          heading: "Recibimos tu compra",
          accent: "#5a1728",
          background: "#f9f5f6",
          intro: `Hola ${patientName}, registramos tu pedido y ya está en nuestra bandeja:`,
          rows,
          note: "Estamos verificando tu comprobante de pago. Te enviaremos otro correo apenas quede aprobado para que puedas acceder a tus materiales.",
          ctaLabel: "Ver mis compras",
          ctaHref: absoluteUrl(deepLink),
        }),
        text: `Recibimos tu compra\nHola ${patientName},\nÍtems: ${itemsList}\nEstado actual: ${purchaseStageLabels.IN_REVIEW}\nTe avisaremos cuando se apruebe el pago.\nVer: ${absoluteUrl(deepLink)}`,
      });
    }

    const adminEmails = await getAdminNotificationEmails();
    const adminHref = absoluteUrl("/dashboard/admin/payments");
    await Promise.all(
      adminEmails.map((to) =>
        sendEmail({
          to,
          subject: `Anttova — Nueva compra por aprobar: ${params.patientName}`,
          html: emailShell({
            heading: "Nueva compra por aprobar",
            accent: "#5a1728",
            background: "#f9f5f6",
            intro: `El paciente <strong>${params.patientName}</strong> realizó una compra y subió su comprobante:`,
            rows: [
              `<strong>Paciente:</strong> ${params.patientName}`,
              `<strong>Ítems:</strong> ${itemsList}`,
            ],
            ctaLabel: "Revisar el pago",
            ctaHref: adminHref,
          }),
          text: `Nueva compra por aprobar\nPaciente: ${params.patientName}\nÍtems: ${itemsList}\nRevisar: ${adminHref}`,
        }),
      ),
    );
  });
}

/** Admin aprobó el pago: la compra queda disponible. */
export async function notifyPurchaseApproved(params: {
  patientId: string;
  itemTitle: string;
  kind: PurchaseItemKind;
  entityId?: string;
  /** Deep link específico (ej. la ficha del recurso). */
  deepLink?: string;
}) {
  await safeNotify(async () => {
    const deepLink = params.deepLink ?? libraryLink(params.kind);
    const kindLabel = params.kind === "RESOURCE" ? "recurso" : "producto";

    await createNotification({
      recipientId: params.patientId,
      type: "PURCHASE_STATUS",
      title: `Compra confirmada · ${purchaseStageLabels.APPROVED}`,
      body: `Tu pago de «${params.itemTitle}» fue verificado. El ${kindLabel} ya está disponible.`,
      payload: {
        deepLink,
        stage: "APPROVED",
        itemKind: params.kind,
        entityId: params.entityId,
      },
    });

    if (!isEmailDeliveryConfigured()) return;

    const user = await prisma.user.findUnique({
      where: { id: params.patientId },
      select: { email: true, name: true },
    });
    if (!user?.email) return;

    await sendEmail({
      to: user.email,
      subject: `Anttova — Tu compra de «${params.itemTitle}» fue confirmada`,
      html: emailShell({
        heading: "¡Tu compra fue confirmada!",
        accent: "#15803d",
        background: "#f0fdf4",
        intro: `Hola ${user.name || "Estimado/a"}, verificamos tu pago y ya podés usar tu ${kindLabel}:`,
        rows: [
          `<strong>Ítem:</strong> ${params.itemTitle}`,
          `<strong>Estado actual:</strong> ${purchaseStageLabels.APPROVED}`,
        ],
        ctaLabel: params.kind === "RESOURCE" ? "Ver mi recurso" : "Ver mi compra",
        ctaHref: absoluteUrl(deepLink),
      }),
      text: `¡Tu compra fue confirmada!\nÍtem: ${params.itemTitle}\nEstado: ${purchaseStageLabels.APPROVED}\nVer: ${absoluteUrl(deepLink)}`,
    });
  });
}

/** Admin rechazó el comprobante. */
export async function notifyPurchaseRejected(params: {
  patientId: string;
  itemTitle: string;
  kind: PurchaseItemKind;
  adminNote?: string | null;
}) {
  await safeNotify(async () => {
    const deepLink = libraryLink(params.kind);
    const reason = params.adminNote?.trim();

    await createNotification({
      recipientId: params.patientId,
      type: "PURCHASE_STATUS",
      title: `Compra no aprobada · ${purchaseStageLabels.REJECTED}`,
      body: reason
        ? `No pudimos validar el pago de «${params.itemTitle}»: ${reason}`
        : `No pudimos validar el pago de «${params.itemTitle}». Escribinos para resolverlo.`,
      payload: { deepLink, stage: "REJECTED", itemKind: params.kind },
    });

    if (!isEmailDeliveryConfigured()) return;

    const user = await prisma.user.findUnique({
      where: { id: params.patientId },
      select: { email: true, name: true },
    });
    if (!user?.email) return;

    const rows = [
      `<strong>Ítem:</strong> ${params.itemTitle}`,
      `<strong>Estado actual:</strong> ${purchaseStageLabels.REJECTED}`,
    ];
    if (reason) rows.push(`<strong>Motivo:</strong> ${reason}`);

    await sendEmail({
      to: user.email,
      subject: `Anttova — No pudimos validar tu pago de «${params.itemTitle}»`,
      html: emailShell({
        heading: "No pudimos validar tu pago",
        accent: "#dc2626",
        background: "#fef2f2",
        intro: `Hola ${user.name || "Estimado/a"}, revisamos tu comprobante y no pudimos confirmarlo:`,
        rows,
        note: "Podés volver a intentar la compra con un comprobante válido o escribirnos y lo resolvemos juntos.",
        ctaLabel: "Volver a intentar",
        ctaHref: absoluteUrl(deepLink),
      }),
      text: `No pudimos validar tu pago de ${params.itemTitle}.${reason ? `\nMotivo: ${reason}` : ""}\nVer: ${absoluteUrl(deepLink)}`,
    });
  });
}
