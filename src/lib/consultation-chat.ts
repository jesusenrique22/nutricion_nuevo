import type { ConsultationChatCode } from "@/types/chat";

export const CONSULTATION_CHAT_CODES: ConsultationChatCode[] = [
  "NUT_01",
  "ENT_02",
  "ANT_03",
];

export const CONSULTATION_CHAT_LABELS: Record<ConsultationChatCode, string> = {
  NUT_01: "Nutrición",
  ENT_02: "Entrenamiento",
  ANT_03: "Antropometría",
};

export function isConsultationChatCode(
  value: string | null | undefined,
): value is ConsultationChatCode {
  return (
    value === "NUT_01" || value === "ENT_02" || value === "ANT_03"
  );
}

export function consultationChatLabel(code: ConsultationChatCode): string {
  return CONSULTATION_CHAT_LABELS[code];
}
