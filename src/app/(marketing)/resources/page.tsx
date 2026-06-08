import { Reveal } from "@/components/motion/reveal";

const items = Array.from({ length: 8 }).map((_, i) => ({
  id: i,
  title: `Recurso ${i + 1}`,
  type: i % 2 === 0 ? "E-book" : "Video",
}));

export default function ResourcesPage() {
  return (
    <div className="px-6 py-16">
      <div className="mx-auto max-w-6xl">
        <Reveal>
          <h1 className="text-4xl font-extrabold">E-Resources</h1>
          <p className="mt-2 text-foreground/60">
            E-books y videos exclusivos de tu nutricionista.
          </p>
        </Reveal>

        <div className="mt-10 grid grid-cols-2 gap-5 sm:grid-cols-3 lg:grid-cols-4">
          {items.map((item, i) => (
            <Reveal key={item.id} delay={i * 0.05}>
              <div className="group cursor-pointer overflow-hidden rounded-2xl border border-foreground/10 bg-white transition hover:-translate-y-1 hover:shadow-xl">
                <div className="aspect-[3/4] bg-gradient-to-br from-primary/20 to-accent/30" />
                <div className="p-4">
                  <span className="text-xs font-bold text-accent">
                    {item.type}
                  </span>
                  <h3 className="mt-1 font-bold">{item.title}</h3>
                </div>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </div>
  );
}
