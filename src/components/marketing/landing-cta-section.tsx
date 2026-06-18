import Image from "next/image";
import Link from "next/link";
import { Reveal } from "@/components/motion/reveal";

export function LandingCtaSection({ backgroundSrc }: { backgroundSrc: string }) {
  return (
    <section className="relative overflow-hidden px-6 py-20 sm:py-24">
      <Image
        src={backgroundSrc}
        alt=""
        fill
        className="object-cover"
        sizes="100vw"
        unoptimized={backgroundSrc.startsWith("/uploads/")}
      />
      <div className="absolute inset-0 bg-primary/55" />
      <div className="relative mx-auto max-w-3xl text-center text-primary-foreground">
        <Reveal direction="up">
          <h2 className="text-2xl font-bold sm:text-4xl">
            Tu mejor versión empieza hoy
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-primary-foreground/90">
            Agenda tu primera consulta, completa tu anamnesis y accede a tu
            panel personal con seguimiento profesional.
          </p>
          <Link
            href="/register"
            className="mt-8 inline-block rounded-full bg-surface px-8 py-3.5 font-semibold text-primary shadow-lg transition hover:scale-105 active:scale-95"
          >
            Crear mi cuenta
          </Link>
        </Reveal>
      </div>
    </section>
  );
}
