import type { ConsultationChatCode } from "@/types/chat";

export const CONSULTATION_CHAT_STYLES: Record<
  ConsultationChatCode,
  { pill: string; dot: string }
> = {
  NUT_01: {
    pill: "border-primary/25 bg-primary/8 text-primary",
    dot: "bg-primary",
  },
  ENT_02: {
    pill: "border-accent/40 bg-accent/15 text-primary",
    dot: "bg-accent",
  },
  ANT_03: {
    pill: "border-foreground/15 bg-muted/70 text-primary",
    dot: "bg-foreground/35",
  },
};
