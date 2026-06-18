"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { prisma } from "@/server/db/prisma";
import { Prisma } from "@prisma/client";
import { currencyPolicySchema } from "@/lib/validators/currency";
import {
  currencyPolicyToRecord,
  parseCurrencyPolicy,
} from "@/lib/currency-policy";
import {
  getExchangeRateSnapshot,
  recomputeExchangeRateFromPolicy,
  refreshExchangeRate,
} from "@/server/services/exchange-rate.service";
import type { ExchangeRateSnapshot } from "@/lib/currency/types";
import {
  CURRENCY_POLICY_SLUG,
  type CurrencyPolicy,
} from "@/types/currency-policy";

export type CurrencyActionResult =
  | { ok: true; snapshot?: ExchangeRateSnapshot }
  | { ok: false; message: string };

async function requireAdmin() {
  const session = await auth();
  if (session?.user?.role !== "ADMIN") return null;
  return session;
}

export async function getPublicExchangeRates(): Promise<ExchangeRateSnapshot | null> {
  try {
    return await getExchangeRateSnapshot();
  } catch {
    return null;
  }
}

export async function getCurrencyPolicyAdmin(): Promise<CurrencyPolicy> {
  if (!(await requireAdmin())) return parseCurrencyPolicy(undefined);
  const row = await prisma.siteContent.findUnique({
    where: { slug: CURRENCY_POLICY_SLUG },
  });
  return parseCurrencyPolicy(row?.data);
}

export async function updateCurrencyPolicy(
  formData: unknown,
): Promise<CurrencyActionResult> {
  if (!(await requireAdmin())) {
    return { ok: false, message: "No autorizado." };
  }

  const parsed = currencyPolicySchema.safeParse(formData);
  if (!parsed.success) {
    return {
      ok: false,
      message: parsed.error.issues[0]?.message ?? "Datos inválidos.",
    };
  }

  const existing = await prisma.siteContent.findUnique({
    where: { slug: CURRENCY_POLICY_SLUG },
  });

  await prisma.siteContent.upsert({
    where: { slug: CURRENCY_POLICY_SLUG },
    create: {
      slug: CURRENCY_POLICY_SLUG,
      title: "Cotización y monedas",
      data: currencyPolicyToRecord(parsed.data) as Prisma.InputJsonValue,
    },
    update: {
      data: {
        ...(existing?.data as Record<string, unknown> | undefined),
        ...currencyPolicyToRecord(parsed.data),
      } as Prisma.InputJsonValue,
    },
  });

  try {
    const snapshot = await recomputeExchangeRateFromPolicy();
    revalidateCurrencyPaths();
    return { ok: true, snapshot };
  } catch {
    try {
      const snapshot = await refreshExchangeRate();
      revalidateCurrencyPaths();
      return { ok: true, snapshot };
    } catch {
      revalidateCurrencyPaths();
      return { ok: true };
    }
  }
}

function revalidateCurrencyPaths() {
  revalidatePath("/dashboard/admin/personalizar");
  revalidatePath("/dashboard/admin/precios-pagos");
  revalidatePath("/dashboard/admin/currency");
  revalidatePath("/dashboard/admin/payments");
  revalidatePath("/dashboard/patient/cart");
  revalidatePath("/dashboard/patient/appointments");
  revalidatePath("/resources");
  revalidatePath("/");
}

export async function forceRefreshExchangeRate(): Promise<CurrencyActionResult> {
  if (!(await requireAdmin())) {
    return { ok: false, message: "No autorizado." };
  }

  try {
    const snapshot = await refreshExchangeRate();
    revalidateCurrencyPaths();
    return { ok: true, snapshot };
  } catch (err) {
    return {
      ok: false,
      message:
        err instanceof Error ? err.message : "No se pudo actualizar la tasa.",
    };
  }
}
