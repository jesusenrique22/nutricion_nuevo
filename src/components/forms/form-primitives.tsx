export function FormSection({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-foreground/10 bg-white p-6">
      <h3 className="text-lg font-bold">{title}</h3>
      {description && (
        <p className="mt-1 text-sm text-foreground/60">{description}</p>
      )}
      <div className="mt-4 space-y-4">{children}</div>
    </section>
  );
}

export function Field({
  label,
  children,
  hint,
  className,
}: {
  label: string;
  children: React.ReactNode;
  hint?: string;
  className?: string;
}) {
  return (
    <div className={className}>
      <label className="text-sm font-semibold">{label}</label>
      {children}
      {hint && <p className="mt-1 text-xs text-foreground/50">{hint}</p>}
    </div>
  );
}

export const inputClass =
  "mt-1.5 w-full rounded-xl border border-foreground/15 px-4 py-3 outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/10";

export const selectClass =
  "mt-1.5 w-full rounded-xl border border-foreground/15 px-4 py-3 outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/10 bg-white";

export const textareaClass =
  "mt-1.5 h-[120px] w-full resize-none overflow-y-auto rounded-xl border border-foreground/15 px-4 py-3 outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/10";
