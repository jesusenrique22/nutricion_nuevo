import Image from "next/image";
import Link from "next/link";
import { BrandGalleryStrip } from "@/components/marketing/brand-gallery-strip";
import { BrandPhilosophySection } from "@/components/marketing/brand-philosophy-section";
import { BrandServicesDetail } from "@/components/marketing/brand-services-detail";
import { BrandSocialFooter } from "@/components/marketing/brand-social-footer";
import { FlyerHero } from "@/components/marketing/flyer-hero";
import { LandingLobbyShell } from "@/components/marketing/landing-lobby-shell";
import { Reveal, RevealScale } from "@/components/motion/reveal";
import { getLandingImages } from "@/server/queries/landing.queries";

export const revalidate = 60;

const packagesMeta = [
  {
    name: "Nutricional",
    code: "NUT-01",
    desc: "Plan alimenticio personalizado, online o presencial.",
    price: "$35.000",
    highlight: true,
    planKey: "nutrition" as const,
  },
  {
    name: "Entrenamiento",
    code: "ENT-02",
    desc: "Rutinas y acompañamiento adaptados a tus metas.",
    price: "$40.000",
    highlight: false,
    planKey: "training" as const,
  },
  {
    name: "Antropometría",
    code: "ANT-03",
    desc: "Mediciones corporales ISAK. Presencial, horario matutino.",
    price: "$25.000",
    highlight: false,
    planKey: "anthropometry" as const,
  },
];

const pillarsMeta = [
  {
    title: "Nutrición consciente",
    desc: "Planes personalizados que se adaptan a tu ritmo de vida, sin restricciones imposibles.",
    planKey: "nutrition" as const,
  },
  {
    title: "Entrenamiento a medida",
    desc: "Rutinas diseñadas para tus objetivos, con seguimiento cercano y motivación constante.",
    planKey: "training" as const,
  },
  {
    title: "Mediciones precisas",
    desc: "Antropometría ISAK para conocer tu composición corporal y medir tu evolución real.",
    planKey: "anthropometry" as const,
  },
];

export default async function LandingPage() {
  const images = await getLandingImages();

  return (
    <LandingLobbyShell>
      <FlyerHero slides={images.heroSlides} />

      <BrandGalleryStrip items={images.gallery} />

      <BrandPhilosophySection imageSrc={images.philosophyImage} />

      <BrandServicesDetail images={images.services} />

      <section className="relative overflow-hidden bg-muted/40 px-6 py-16 sm:py-20">
        <div
          aria-hidden
          className="pointer-events-none absolute -right-20 top-1/2 h-64 w-64 -translate-y-1/2 rounded-full bg-accent-soft/50 blur-3xl"
        />
        <div className="relative mx-auto max-w-5xl">
          <Reveal>
            <p className="text-center text-xs font-semibold uppercase tracking-[0.28em] text-foreground/60">
              Nuestro enfoque
            </p>
            <h2 className="mt-2 text-center text-2xl font-bold sm:text-3xl">
              Tres pilares, un solo camino
            </h2>
          </Reveal>
          <div className="mt-10 grid gap-6 sm:mt-12 md:grid-cols-3">
            {pillarsMeta.map((pillar, i) => (
              <RevealScale key={pillar.title} delay={i * 0.1} pulse>
                <article className="group overflow-hidden rounded-3xl bg-surface shadow-lg shadow-primary/5 transition hover:-translate-y-1 hover:shadow-xl">
                  <div className="relative aspect-[4/3] overflow-hidden">
                    <Image
                      src={images.plans[pillar.planKey]}
                      alt={pillar.title}
                      fill
                      className="object-cover object-top transition duration-700 group-hover:scale-105"
                      sizes="(max-width: 768px) 100vw, 33vw"
                      unoptimized={images.plans[pillar.planKey].startsWith(
                        "/uploads/",
                      )}
                    />
                  </div>
                  <div className="p-5 sm:p-6">
                    <h3 className="text-lg font-bold">{pillar.title}</h3>
                    <p className="mt-2 text-sm leading-relaxed text-foreground/70">
                      {pillar.desc}
                    </p>
                  </div>
                </article>
              </RevealScale>
            ))}
          </div>
        </div>
      </section>

      <section className="px-6 py-16 sm:py-20">
        <div className="mx-auto grid max-w-5xl items-center gap-10 md:grid-cols-2 md:gap-14">
          <Reveal direction="right" delay={0.1} className="md:order-2">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.28em] text-foreground/60">
                La marca
              </p>
              <h2 className="mt-2 text-2xl font-bold sm:text-3xl">
                Entrena con intención
              </h2>
              <p className="mt-4 leading-relaxed text-foreground/70">
                Anttova es más que consultas: es un estilo de vida. Foco,
                constancia y balance en cada paso de tu proceso de transformación.
              </p>
            </div>
          </Reveal>
          <Reveal direction="left" className="md:order-1">
            <div className="relative aspect-square overflow-hidden rounded-3xl bg-muted">
              <Image
                src={images.brandSectionImage}
                alt="Productos Anttova"
                fill
                className="object-contain p-6 sm:p-10"
                sizes="(max-width: 768px) 100vw, 50vw"
                unoptimized={images.brandSectionImage.startsWith("/uploads/")}
              />
            </div>
          </Reveal>
        </div>
      </section>

      <section
        id="paquetes"
        className="lobby-panel flex min-h-[100svh] scroll-mt-20 flex-col justify-center bg-primary px-6 py-16 text-primary-foreground sm:py-20"
      >
        <div className="mx-auto w-full max-w-5xl">
          <Reveal direction="fade">
            <p className="text-center text-xs font-semibold uppercase tracking-[0.28em] text-accent-soft">
              Servicios
            </p>
            <h2 className="mt-2 text-center text-2xl font-bold sm:text-3xl">
              Paquetes disponibles
            </h2>
          </Reveal>
          <div className="mt-10 grid gap-6 sm:mt-12 md:grid-cols-3">
            {packagesMeta.map((pkg, i) => (
              <RevealScale key={pkg.code} delay={i * 0.1} pulse>
                <div
                  className={`flex h-full flex-col overflow-hidden rounded-3xl transition hover:-translate-y-1 hover:shadow-xl ${
                    pkg.highlight
                      ? "bg-accent-soft text-foreground shadow-lg"
                      : "border border-white/10 bg-white/5 backdrop-blur-sm"
                  }`}
                >
                  <div className="relative aspect-[16/10] overflow-hidden bg-muted/20">
                    <Image
                      src={images.plans[pkg.planKey]}
                      alt={pkg.name}
                      fill
                      className="object-cover object-top"
                      sizes="(max-width: 768px) 100vw, 33vw"
                      unoptimized={images.plans[pkg.planKey].startsWith(
                        "/uploads/",
                      )}
                    />
                    {!pkg.highlight && (
                      <div className="absolute inset-0 bg-primary/25" />
                    )}
                  </div>
                  <div className="flex flex-1 flex-col p-6 sm:p-7">
                    <span className="text-xs font-bold uppercase tracking-widest opacity-70">
                      {pkg.code}
                    </span>
                    <h3 className="mt-2 text-xl font-bold">{pkg.name}</h3>
                    <p
                      className={`mt-3 flex-1 text-sm ${
                        pkg.highlight
                          ? "text-foreground/80"
                          : "text-primary-foreground/70"
                      }`}
                    >
                      {pkg.desc}
                    </p>
                    <div className="mt-6 text-3xl font-extrabold">
                      {pkg.price}
                    </div>
                    <Link
                      href="/register"
                      className={`mt-6 rounded-full px-5 py-2.5 text-center font-semibold transition active:scale-95 ${
                        pkg.highlight
                          ? "bg-primary text-primary-foreground hover:scale-105"
                          : "bg-primary-foreground text-primary hover:scale-105"
                      }`}
                    >
                      Agendar
                    </Link>
                  </div>
                </div>
              </RevealScale>
            ))}
          </div>
        </div>
      </section>

      <section className="relative overflow-hidden px-6 py-20 sm:py-24">
        <Image
          src={images.ctaBackground}
          alt=""
          fill
          className="object-cover"
          sizes="100vw"
          unoptimized={images.ctaBackground.startsWith("/uploads/")}
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

      <BrandSocialFooter />
    </LandingLobbyShell>
  );
}
