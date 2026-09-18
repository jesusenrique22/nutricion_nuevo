"use server";

import { auth } from "@/lib/auth";
import { guessContentKindFromUrl } from "@/lib/content-kind";
import { prisma } from "@/server/db/prisma";

export interface ResourceDTO {
  id: string;
  title: string;
  description: string | null;
  type: string;
  coverUrl: string | null;
  /**
   * Solo para ADMIN. Al paciente se le manda `null`: la ruta del archivo viaja
   * en el HTML de la página, y con ella podría abrir el PDF en el visor nativo
   * del navegador —con descargar e imprimir— saltándose el visor de Anttova.
   */
  contentUrl: string | null;
  videoUrl: string | null;
  /** Lo que el visor necesita saber sin conocer la ruta del archivo. */
  hasContent: boolean;
  hasVideo: boolean;
  contentKind: "pdf" | "image" | "video" | "unknown";
  linkUrl: string | null;
  body: string | null;
  price: string;
  currency: string;
  category: string | null;
  isPublished: boolean;
  sortOrder: number;
  owned?: boolean;
  accessStatus?: "PENDING" | "GRANTED" | "REFUNDED" | null;
}

function mapResource(
  r: {
    id: string;
    title: string;
    description: string | null;
    type: string;
    coverUrl: string | null;
    contentUrl: string | null;
    videoUrl: string | null;
    linkUrl: string | null;
    body: string | null;
    price: { toString(): string };
    currency: string;
    category: string | null;
    isPublished: boolean;
    sortOrder: number;
  },
  opts: {
    owned?: boolean;
    accessStatus?: "PENDING" | "GRANTED" | "REFUNDED" | null;
    /** Solo el panel de administración recibe las rutas reales. */
    exposeFiles?: boolean;
  } = {},
): ResourceDTO {
  const exposeFiles = opts.exposeFiles ?? false;
  return {
    id: r.id,
    title: r.title,
    description: r.description,
    type: r.type,
    coverUrl: r.coverUrl,
    contentUrl: exposeFiles ? r.contentUrl : null,
    videoUrl: exposeFiles ? r.videoUrl : null,
    hasContent: Boolean(r.contentUrl),
    hasVideo: Boolean(r.videoUrl),
    contentKind: guessContentKindFromUrl(r.contentUrl, r.type),
    linkUrl: r.linkUrl,
    body: r.body,
    price: r.price.toString(),
    currency: r.currency,
    category: r.category,
    isPublished: r.isPublished,
    sortOrder: r.sortOrder,
    owned: opts.owned,
    accessStatus: opts.accessStatus ?? null,
  };
}

export async function getPublishedResourcePackages(): Promise<ResourceDTO[]> {
  try {
    const resources = await prisma.resource.findMany({
      where: { isPublished: true, type: "PACKAGE" },
      orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }],
    });
    return resources.map((r) => mapResource(r));
  } catch {
    return [];
  }
}

export async function getPublishedResources(): Promise<ResourceDTO[]> {
  const session = await auth();
  try {
    const resources = await prisma.resource.findMany({
      where: { isPublished: true },
      orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }],
    });

    if (!session?.user?.id) {
      return resources.map((r) => mapResource(r));
    }

    const purchases = await prisma.resourcePurchase.findMany({
      where: { userId: session.user.id },
      select: { resourceId: true, status: true },
    });
    const purchaseMap = new Map(purchases.map((p) => [p.resourceId, p.status]));

    return resources.map((r) => {
      const status = purchaseMap.get(r.id);
      return mapResource(r, {
        owned: status === "GRANTED",
        accessStatus: status ?? null,
      });
    });
  } catch {
    return [];
  }
}

export async function getAllResourcesAdmin(): Promise<ResourceDTO[]> {
  const session = await auth();
  if (session?.user?.role !== "ADMIN") return [];

  const resources = await prisma.resource.findMany({
    orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }],
  });
  return resources.map((r) => mapResource(r, { exposeFiles: true }));
}

export async function getMyLibraryResources(): Promise<ResourceDTO[]> {
  const session = await auth();
  if (!session?.user?.id) return [];

  const purchases = await prisma.resourcePurchase.findMany({
    where: { userId: session.user.id, status: "GRANTED" },
    include: { resource: true },
    orderBy: { createdAt: "desc" },
  });

  return purchases.map((p) =>
    mapResource(p.resource, { owned: true, accessStatus: "GRANTED" }),
  );
}

export async function getMyPendingResources(): Promise<ResourceDTO[]> {
  const session = await auth();
  if (!session?.user?.id) return [];

  const purchases = await prisma.resourcePurchase.findMany({
    where: { userId: session.user.id, status: "PENDING" },
    include: { resource: true },
    orderBy: { createdAt: "desc" },
  });

  return purchases.map((p) =>
    mapResource(p.resource, { owned: false, accessStatus: "PENDING" }),
  );
}

export async function getAvailableResourcesForPatient(): Promise<ResourceDTO[]> {
  const session = await auth();
  if (!session?.user?.id) return getPublishedResources();

  const [catalog, purchases] = await Promise.all([
    prisma.resource.findMany({
      where: { isPublished: true },
      orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }],
    }),
    prisma.resourcePurchase.findMany({
      where: { userId: session.user.id },
      select: { resourceId: true, status: true },
    }),
  ]);

  const blocked = new Set(
    purchases
      .filter((p) => p.status === "GRANTED" || p.status === "PENDING")
      .map((p) => p.resourceId),
  );

  return catalog
    .filter((r) => !blocked.has(r.id))
    .map((r) => mapResource(r));
}

export async function getResourceById(
  id: string,
): Promise<ResourceDTO | null> {
  const session = await auth();
  const resource = await prisma.resource.findUnique({ where: { id } });
  if (!resource) return null;

  const isAdmin = session?.user?.role === "ADMIN";
  if (!resource.isPublished && !isAdmin) return null;

  let accessStatus: "PENDING" | "GRANTED" | "REFUNDED" | null = null;
  if (session?.user?.id) {
    const purchase = await prisma.resourcePurchase.findUnique({
      where: {
        userId_resourceId: {
          userId: session.user.id,
          resourceId: id,
        },
      },
    });
    accessStatus = purchase?.status ?? null;
  }

  const owned = isAdmin || accessStatus === "GRANTED";
  if (!owned && !isAdmin) return null;

  return mapResource(resource, { owned, accessStatus, exposeFiles: isAdmin });
}

export interface PendingResourceRequestDTO {
  id: string;
  userId: string;
  userName: string;
  userEmail: string;
  resourceId: string;
  resourceTitle: string;
  pricePaid: string;
  createdAt: string;
}

export async function getPendingResourceRequests(): Promise<
  PendingResourceRequestDTO[]
> {
  const session = await auth();
  if (session?.user?.role !== "ADMIN") return [];

  const rows = await prisma.resourcePurchase.findMany({
    where: { status: "PENDING" },
    include: { user: true, resource: true },
    orderBy: { createdAt: "desc" },
  });

  return rows.map((r) => ({
    id: r.id,
    userId: r.userId,
    userName: r.user.name,
    userEmail: r.user.email,
    resourceId: r.resourceId,
    resourceTitle: r.resource.title,
    pricePaid: r.pricePaid.toString(),
    createdAt: r.createdAt.toISOString(),
  }));
}

/** Catálogo publicado con estado de acceso de un paciente (solo ADMIN). */
export async function getPublishedResourcesForPatientAdmin(
  patientId: string,
): Promise<ResourceDTO[]> {
  const session = await auth();
  if (session?.user?.role !== "ADMIN") return [];

  const [catalog, purchases] = await Promise.all([
    prisma.resource.findMany({
      where: { isPublished: true },
      orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }],
    }),
    prisma.resourcePurchase.findMany({
      where: { userId: patientId },
      select: { resourceId: true, status: true },
    }),
  ]);

  const statusByResource = new Map(
    purchases.map((p) => [p.resourceId, p.status]),
  );

  return catalog.map((r) =>
    mapResource(r, {
      accessStatus: statusByResource.get(r.id) ?? null,
      exposeFiles: true,
    }),
  );
}
