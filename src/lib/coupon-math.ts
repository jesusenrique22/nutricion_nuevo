import { Prisma } from "@prisma/client";
import { clampPercentOff } from "@/lib/coupons";

export function applyPercentOff(
  amount: Prisma.Decimal | number | string,
  percentOff: number,
): Prisma.Decimal {
  const total =
    amount instanceof Prisma.Decimal ? amount : new Prisma.Decimal(amount);
  const pct = clampPercentOff(percentOff);
  if (pct <= 0) return total.toDecimalPlaces(2);
  if (pct >= 100) return new Prisma.Decimal(0);
  return total
    .mul(100 - pct)
    .div(100)
    .toDecimalPlaces(2, Prisma.Decimal.ROUND_HALF_UP);
}
