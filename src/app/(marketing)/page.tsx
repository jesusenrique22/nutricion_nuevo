import Link from "next/link";
import { Reveal } from "@/components/motion/reveal";

const packages = [
  {
    name: "Nutricional",
    code: "NUT-01",
    desc: "Plan alimenticio personalizado, online o presencial.",
    price: "$50",
    highlight: false,
  },
  {
    name: "Entrenamiento",
    code: "ENT-02",
    desc: "Rutinas y acompañamiento adaptados a tus metas.",
    price: "$40",
    highlight: true,
  },
  {
    name: "Antropometría",
    code: "ANT-03",
    desc: "Mediciones corporales precisas. Presencial, horario matutino.",
    price: "$35",
    highlight: false,
  },
];

export default function LandingPage() {
  return (
    <div className="flex flex-col">
      {/* Hero */}
      <section className="relative overflow-hidden px-6 py-24 sm:py-32">
        <div className="mx-auto max-w-4xl text-center">
          <Reveal>
            <span className="inline-block rounded-full bg-muted px-4 py-1 text-sm font-semibold text-primary">
              Nutrición que se adapta a ti
            </span>
          </Reveal>
          <Reveal delay={0.1}>
            <h1 className="mt-6 text-4xl font-extrabold tracking-tight text-foreground sm:text-6xl">
              Tu mejor versión empieza por lo que{" "}
              <span className="text-primary">comes</span>.
            </h1>
          </Reveal>
          <Reveal delay={0.2}>
            <p className="mx-auto mt-6 max-w-2xl text-lg text-foreground/70">
              Agenda tus consultas, conversa con tu nutricionista en tiempo real
              y accede a recursos exclusivos. Todo en un solo lugar, cálido e
              intuitivo.
            </p>
          </Reveal>
          <Reveal delay={0.3}>
            <div className="mt-10 flex items-center justify-center gap-4">
              <Link
                href="/register"
                className="rounded-full bg-primary px-7 py-3 font-semibold text-primary-foreground shadow-lg shadow-primary/30 transition hover:scale-105"
              >
                Empezar ahora
              </Link>
              <Link
                href="#paquetes"
                className="rounded-full border border-foreground/15 px-7 py-3 font-semibold text-foreground transition hover:bg-muted"
              >
                Ver paquetes
              </Link>
            </div>
          </Reveal>
        </div>
      </section>

      {/* Perfil nutricionista */}
      <section className="px-6 py-16">
        <div className="mx-auto grid max-w-5xl items-center gap-10 md:grid-cols-2">
          <Reveal>
            <div className="aspect-square rounded-3xl bg-gradient-to-br from-primary/20 to-accent/30" />
          </Reveal>
          <Reveal delay={0.15}>
            <div>
              <h2 className="text-3xl font-bold">Hola, soy tu nutricionista</h2>
              <p className="mt-4 text-foreground/70">
                Creo en una nutrición empática, sin dietas imposibles. Te
                acompaño paso a paso para construir hábitos que duren toda la
                vida, con seguimiento cercano y herramientas a tu medida.
              </p>
              <div className="mt-6 flex gap-4 text-sm font-semibold text-primary">
                <a href="#" className="hover:underline">
                  Instagram
                </a>
                <a href="#" className="hover:underline">
                  TikTok
                </a>
                <a href="#" className="hover:underline">
                  YouTube
                </a>
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      {/* Paquetes */}
      <section id="paquetes" className="px-6 py-20">
        <div className="mx-auto max-w-5xl">
          <Reveal>
            <h2 className="text-center text-3xl font-bold">
              Paquetes disponibles
            </h2>
          </Reveal>
          <div className="mt-12 grid gap-6 md:grid-cols-3">
            {packages.map((pkg, i) => (
              <Reveal key={pkg.code} delay={i * 0.1}>
                <div
                  className={`flex h-full flex-col rounded-3xl border p-7 transition hover:-translate-y-1 hover:shadow-xl ${
                    pkg.highlight
                      ? "border-primary bg-primary text-primary-foreground shadow-lg"
                      : "border-foreground/10 bg-white"
                  }`}
                >
                  <span className="text-xs font-bold opacity-70">
                    {pkg.code}
                  </span>
                  <h3 className="mt-2 text-xl font-bold">{pkg.name}</h3>
                  <p
                    className={`mt-3 text-sm ${
                      pkg.highlight ? "opacity-90" : "text-foreground/70"
                    }`}
                  >
                    {pkg.desc}
                  </p>
                  <div className="mt-6 text-3xl font-extrabold">{pkg.price}</div>
                  <Link
                    href="/register"
                    className={`mt-6 rounded-full px-5 py-2.5 text-center font-semibold transition ${
                      pkg.highlight
                        ? "bg-white text-primary"
                        : "bg-primary text-primary-foreground hover:scale-105"
                    }`}
                  >
                    Agendar
                  </Link>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
