import { appointmentStatusLabels } from "@/lib/appointment-labels";

export const STATUS_UI: Record<
  string,
  { dot: string; card: string; badge: string }
> = {
  PENDING: {
    dot: "bg-muted",
    card: "border-muted bg-muted/30 hover:border-accent-soft",
    badge: "bg-muted text-foreground",
  },
  CONFIRMED: {
    dot: "bg-primary",
    card: "border-primary/20 bg-primary/5 hover:border-primary/40 hover:bg-primary/8",
    badge: "bg-primary text-primary-foreground",
  },
  COMPLETED: {
    dot: "bg-surface ring-2 ring-primary",
    card: "border-primary/15 bg-surface hover:border-primary/30",
    badge: "bg-surface text-foreground ring-1 ring-primary/30",
  },
  CANCELLED: {
    dot: "bg-accent",
    card: "border-accent/30 bg-accent/10 opacity-75 hover:opacity-100",
    badge: "bg-accent/80 text-primary-foreground",
  },
  NO_SHOW: {
    dot: "bg-accent",
    card: "border-accent/30 bg-accent/10 opacity-75 hover:opacity-100",
    badge: "bg-accent/80 text-primary-foreground",
  },
};

export function statusLabel(status: string): string {
  return appointmentStatusLabels[status] ?? status;
}

export function statusUi(status: string) {
  return STATUS_UI[status] ?? STATUS_UI.CONFIRMED!;
}
