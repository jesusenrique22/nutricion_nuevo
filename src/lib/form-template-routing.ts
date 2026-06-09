import { FORM_TYPE_TO_TEMPLATE } from "@/lib/form-templates-catalog";
import type { ConsultationFormType } from "@/lib/form-routing";

export function templateCodeForFormType(
  formType: ConsultationFormType,
): string | null {
  return FORM_TYPE_TO_TEMPLATE[formType] ?? null;
}
