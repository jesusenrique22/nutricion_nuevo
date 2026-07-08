import { LoadingIndicator } from "@/components/ui/loading-indicator";

export function PageLoading({
  message = "Cargando…",
  compact = false,
}: {
  message?: string;
  compact?: boolean;
}) {
  return (
    <div
      className={
        compact
          ? "flex w-full items-center justify-center py-12"
          : "flex min-h-[min(100%,calc(100dvh-8rem))] w-full flex-1 flex-col items-center justify-center px-4 py-8"
      }
      role="status"
      aria-live="polite"
      aria-label={message}
    >
      <div className="flex flex-col items-center rounded-3xl border border-primary/10 bg-surface/80 px-8 py-7 shadow-sm ring-1 ring-primary/5">
        <LoadingIndicator size="lg" label={message} />
        <p className="mt-4 text-center text-sm font-medium text-foreground/55">
          {message}
        </p>
      </div>
    </div>
  );
}
