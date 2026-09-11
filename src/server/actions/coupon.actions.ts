"use server";

import { revalidatePath } from "next/cache";
import { Prisma } from "@prisma/client";
import { requireAdmin } from "@/lib/security/auth-guards";
import { auth } from "@/lib/auth";
import {
  clampPercentOff,
  expiresAtFromDuration,
  generateRandomCouponCode,
  hasRedemptionsRemaining,
  isCouponCurrentlyValid,
  isCouponDuration,
  isValidCouponCodeFormat,
  normalizeCouponCode,
  parseMaxRedemptionsInput,
  type CouponDuration,
} from "@/lib/coupons";
import { prisma } from "@/server/db/prisma";
import { formatActionError } from "@/lib/db-errors";

export type CouponActionResult =
  | { ok: true }
  | { ok: false; message: string };

export type AdminCouponDTO = {
  id: string;
  code: string;
  percentOff: number;
  duration: CouponDuration;
  maxRedemptions: number | null;
  startsAt: string;
  expiresAt: string | null;
  active: boolean;
  redemptionCount: number;
  createdAt: string;
  isExpired: boolean;
  isExhausted: boolean;
};

export type AppliedCouponDTO = {
  id: string;
  code: string;
  percentOff: number;
};

function toAdminDto(row: {
  id: string;
  code: string;
  percentOff: number;
  duration: CouponDuration;
  maxRedemptions: number | null;
  startsAt: Date;
  expiresAt: Date | null;
  active: boolean;
  createdAt: Date;
  _count: { redemptions: number };
}): AdminCouponDTO {
  const expired =
    row.expiresAt !== null && row.expiresAt.getTime() <= Date.now();
  const exhausted = !hasRedemptionsRemaining({
    maxRedemptions: row.maxRedemptions,
    redemptionCount: row._count.redemptions,
  });
  return {
    id: row.id,
    code: row.code,
    percentOff: row.percentOff,
    duration: row.duration,
    maxRedemptions: row.maxRedemptions,
    startsAt: row.startsAt.toISOString(),
    expiresAt: row.expiresAt?.toISOString() ?? null,
    active: row.active,
    redemptionCount: row._count.redemptions,
    createdAt: row.createdAt.toISOString(),
    isExpired: expired,
    isExhausted: exhausted,
  };
}

export async function listCouponsAdmin(): Promise<AdminCouponDTO[]> {
  const admin = await requireAdmin();
  if (!admin) return [];

  const rows = await prisma.coupon.findMany({
    where: { active: true },
    include: { _count: { select: { redemptions: true } } },
    orderBy: { createdAt: "desc" },
  });
  return rows.map(toAdminDto);
}

export async function createCoupon(input: {
  codeMode: "custom" | "random";
  code?: string;
  percentOff: number;
  duration: string;
  maxRedemptions?: string;
}): Promise<CouponActionResult & { code?: string }> {
  try {
    const admin = await requireAdmin();
    if (!admin) return { ok: false, message: "No autorizado." };

    if (!isCouponDuration(input.duration)) {
      return { ok: false, message: "Duración no válida." };
    }

    const percentOff = clampPercentOff(Number(input.percentOff));
    if (percentOff < 1 || percentOff > 100) {
      return { ok: false, message: "El descuento debe ser entre 1% y 100%." };
    }

    let code: string;
    if (input.codeMode === "random") {
      code = generateRandomCouponCode(8);
      for (let attempt = 0; attempt < 5; attempt++) {
        const exists = await prisma.coupon.findUnique({ where: { code } });
        if (!exists) break;
        code = generateRandomCouponCode(8);
      }
    } else {
      code = normalizeCouponCode(input.code ?? "");
      if (!isValidCouponCodeFormat(code)) {
        return {
          ok: false,
          message:
            "El código debe tener entre 3 y 32 caracteres (letras, números, - o _).",
        };
      }
    }

    const maxParsed = parseMaxRedemptionsInput(input.maxRedemptions ?? "");
    if (maxParsed === "invalid") {
      return {
        ok: false,
        message:
          "El límite de canjes debe ser un número entero mayor a 0, o dejalo vacío para ilimitado.",
      };
    }

    const startsAt = new Date();
    const expiresAt = expiresAtFromDuration(input.duration, startsAt);

    try {
      await prisma.coupon.create({
        data: {
          code,
          percentOff,
          duration: input.duration,
          maxRedemptions: maxParsed,
          startsAt,
          expiresAt,
          active: true,
          createdById: admin.user.id,
        },
      });
    } catch (err) {
      if (
        err instanceof Prisma.PrismaClientKnownRequestError &&
        err.code === "P2002"
      ) {
        return {
          ok: false,
          message: "Ese código ya existe. Probá con otro.",
        };
      }
      throw err;
    }

    revalidatePath("/dashboard/admin/cupones");
    return { ok: true, code };
  } catch (err) {
    return { ok: false, message: formatActionError(err) };
  }
}

export async function updateCouponMaxRedemptions(input: {
  couponId: string;
  maxRedemptions: string;
}): Promise<CouponActionResult> {
  try {
    const admin = await requireAdmin();
    if (!admin) return { ok: false, message: "No autorizado." };

    const parsed = parseMaxRedemptionsInput(input.maxRedemptions);
    if (parsed === "invalid") {
      return {
        ok: false,
        message:
          "El límite de canjes debe ser un número entero mayor a 0, o dejalo vacío para ilimitado.",
      };
    }

    const coupon = await prisma.coupon.findUnique({
      where: { id: input.couponId },
      include: { _count: { select: { redemptions: true } } },
    });
    if (!coupon || !coupon.active) {
      return { ok: false, message: "Cupón no encontrado." };
    }

    if (
      parsed !== null &&
      parsed < coupon._count.redemptions
    ) {
      return {
        ok: false,
        message: `No podés bajar el límite por debajo de los canjes actuales (${coupon._count.redemptions}).`,
      };
    }

    await prisma.coupon.update({
      where: { id: input.couponId },
      data: { maxRedemptions: parsed },
    });

    revalidatePath("/dashboard/admin/cupones");
    return { ok: true };
  } catch (err) {
    return { ok: false, message: formatActionError(err) };
  }
}

export async function deleteCoupon(couponId: string): Promise<CouponActionResult> {
  try {
    const admin = await requireAdmin();
    if (!admin) return { ok: false, message: "No autorizado." };

    const coupon = await prisma.coupon.findUnique({ where: { id: couponId } });
    if (!coupon) return { ok: false, message: "Cupón no encontrado." };

    // Soft-delete: deja de poder usarse; mantiene historial de canjes.
    await prisma.coupon.update({
      where: { id: couponId },
      data: { active: false },
    });

    revalidatePath("/dashboard/admin/cupones");
    return { ok: true };
  } catch (err) {
    return { ok: false, message: formatActionError(err) };
  }
}

/** Valida un cupón para el paciente actual (preview en carrito). */
export async function validateCouponForCart(
  rawCode: string,
): Promise<
  | { ok: true; coupon: AppliedCouponDTO }
  | { ok: false; message: string }
> {
  try {
    const session = await auth();
    if (!session?.user?.id || session.user.role !== "PATIENT") {
      return { ok: false, message: "No autorizado." };
    }

    const code = normalizeCouponCode(rawCode);
    if (!code) return { ok: false, message: "Ingresá un código de cupón." };

    const coupon = await prisma.coupon.findUnique({
      where: { code },
      include: { _count: { select: { redemptions: true } } },
    });
    if (!coupon || !isCouponCurrentlyValid(coupon)) {
      return { ok: false, message: "Cupón inválido o vencido." };
    }

    if (
      !hasRedemptionsRemaining({
        maxRedemptions: coupon.maxRedemptions,
        redemptionCount: coupon._count.redemptions,
      })
    ) {
      return { ok: false, message: "Este cupón ya alcanzó el límite de usos." };
    }

    const already = await prisma.couponRedemption.findUnique({
      where: {
        couponId_userId: { couponId: coupon.id, userId: session.user.id },
      },
    });
    if (already) {
      return { ok: false, message: "Ya usaste este cupón." };
    }

    return {
      ok: true,
      coupon: {
        id: coupon.id,
        code: coupon.code,
        percentOff: coupon.percentOff,
      },
    };
  } catch (err) {
    return { ok: false, message: formatActionError(err) };
  }
}

/** Uso interno en checkout: valida y devuelve el cupón listo para aplicar. */
export async function resolveCouponForCheckout(params: {
  userId: string;
  rawCode: string | undefined;
}): Promise<
  | { ok: true; coupon: { id: string; code: string; percentOff: number } }
  | { ok: true; coupon: null }
  | { ok: false; message: string }
> {
  const raw = params.rawCode?.trim();
  if (!raw) return { ok: true, coupon: null };

  const code = normalizeCouponCode(raw);
  const coupon = await prisma.coupon.findUnique({
    where: { code },
    include: { _count: { select: { redemptions: true } } },
  });
  if (!coupon || !isCouponCurrentlyValid(coupon)) {
    return { ok: false, message: "Cupón inválido o vencido." };
  }

  if (
    !hasRedemptionsRemaining({
      maxRedemptions: coupon.maxRedemptions,
      redemptionCount: coupon._count.redemptions,
    })
  ) {
    return { ok: false, message: "Este cupón ya alcanzó el límite de usos." };
  }

  const already = await prisma.couponRedemption.findUnique({
    where: {
      couponId_userId: { couponId: coupon.id, userId: params.userId },
    },
  });
  if (already) {
    return { ok: false, message: "Ya usaste este cupón." };
  }

  return {
    ok: true,
    coupon: {
      id: coupon.id,
      code: coupon.code,
      percentOff: coupon.percentOff,
    },
  };
}

export async function recordCouponRedemption(params: {
  couponId: string;
  userId: string;
  percentOff: number;
}) {
  await prisma.couponRedemption.create({
    data: {
      couponId: params.couponId,
      userId: params.userId,
      percentOff: params.percentOff,
    },
  });
}
