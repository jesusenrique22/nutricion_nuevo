import Link from "next/link";
import { ExternalLinkIcon } from "@/components/ui/link-icons";

export function PatientAdminResourceCard({
  url,
  note,
}: {
  url: string;
  note: string | null;
}) {
  return (
    <section className="rounded-2xl border border-primary/15 bg-gradient-to-br from-primary/[0.06] to-white p-5 sm:p-6">
      <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-accent">
        De tu nutricionista
      </p>
      <h2 className="mt-2 text-lg font-bold text-foreground">
        Material compartido
      </h2>
      {note && (
        <p className="mt-2 text-sm leading-relaxed text-foreground/65">{note}</p>
      )}
      <Link
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        className="mt-4 inline-flex items-center gap-2 rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground transition hover:scale-[1.02]"
      >
        Abrir material
        <ExternalLinkIcon className="h-4 w-4" />
      </Link>
    </section>
  );
}
