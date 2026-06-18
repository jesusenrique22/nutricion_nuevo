import { z } from "zod";

export const currencyPolicySchema = z.object({
  markupPercent: z.coerce.number().min(0).max(100),
});
