"use server";

import { auth } from "@/lib/auth";
import { prisma } from "@/server/db/prisma";

export interface ResourceDTO {
  id: string;
  title: string;
  description: string | null;
  type: string;
  coverUrl: string | null;
  contentUrl: string | null;
  videoUrl: string | null;
  linkUrl: string | null;
  body: string | null;
  price: string;
  currency: string;
  category: string | null;
  isPublished: boolean;
  sortOrder: number;
  owned?: boolean;
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
  owned = false,
): ResourceDTO {
  return {
    id: r.id,
    title: r.title,
    description: r.description,
    type: r.type,
    coverUrl: r.coverUrl,
    contentUrl: r.contentUrl,
    videoUrl: r.videoUrl,
    linkUrl: r.linkUrl,
    body: r.body,
    price: r.price.toString(),
    currency: r.currency,
    category: r.category,
    isPublished: r.isPublished,
    sortOrder: r.sortOrder,
    owned,
  };
}

export async function getPublishedResources(): Promise<ResourceDTO[]> {
  const resources = await prisma.resource.findMany({
    where: { isPublished: true },
    orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }],
  });
  return resources.map((r) => mapResource(r));
}

export async function getAllResourcesAdmin(): Promise<ResourceDTO[]> {
  const session = await auth();
  if (session?.user?.role !== "ADMIN") return [];

  const resources = await prisma.resource.findMany({
    orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }],
  });
  return resources.map((r) => mapResource(r));
}

export async function getMyLibraryResources(): Promise<ResourceDTO[]> {
  const session = await auth();
  if (!session?.user?.id) return [];

  const purchases = await prisma.resourcePurchase.findMany({
    where: { userId: session.user.id },
    include: { resource: true },
    orderBy: { createdAt: "desc" },
  });

  return purchases.map((p) => mapResource(p.resource, true));
}

export async function getResourceById(
  id: string,
): Promise<ResourceDTO | null> {
  const session = await auth();
  const resource = await prisma.resource.findUnique({ where: { id } });
  if (!resource) return null;

  const isAdmin = session?.user?.role === "ADMIN";
  if (!resource.isPublished && !isAdmin) return null;

  let owned = false;
  if (session?.user?.id) {
    const purchase = await prisma.resourcePurchase.findUnique({
      where: {
        userId_resourceId: {
          userId: session.user.id,
          resourceId: id,
        },
      },
    });
    owned = Boolean(purchase);
  }

  return mapResource(resource, owned);
}
