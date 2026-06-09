import Image from "next/image";
import type { WeeklyPlanData } from "@/types/weekly-plan";
import { BRAND_PRESENTATION } from "@/lib/brand-assets";

export function PatientWeeklyPlanView({ plan }: { plan: WeeklyPlanData | null }) {
  if (!plan) {
    return (
      <section className="overflow-hidden rounded-3xl ring-1 ring-primary/10">
        <div className="grid md:grid-cols-2">
          <div className="flex flex-col justify-center bg-gradient-to-br from-accent-soft/30 to-muted/20 p-6 sm:p-8">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-foreground/50">
              Plan semanal
            </p>
            <h2 className="mt-2 text-2xl font-extralight uppercase text-primary">
              Tu distribución
            </h2>
            <p className="mt-2 text-sm text-foreground/65">
              Cuando tu nutricionista publique tu plan personalizado, aparecerá
              aquí con el detalle de cada comida de la semana.
            </p>
          </div>
          <div className="relative min-h-[200px] bg-white/50">
            <Image
              src={BRAND_PRESENTATION.weeklyPlan}
              alt="Ejemplo plan semanal Anttova"
              fill
              className="object-contain object-right p-4"
              sizes="(max-width: 768px) 100vw, 50vw"
            />
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="overflow-hidden rounded-3xl ring-1 ring-primary/10">
      <div className="bg-gradient-to-br from-primary/5 to-accent-soft/20 p-6 sm:p-8">
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-foreground/50">
          Plan semanal
        </p>
        <h2 className="mt-2 text-2xl font-extralight uppercase text-primary">
          {plan.title}
        </h2>
        {plan.weekLabel && (
          <p className="mt-1 text-sm font-medium text-foreground/70">
            {plan.weekLabel}
          </p>
        )}
        {plan.notes && (
          <p className="mt-3 text-sm leading-relaxed text-foreground/65">
            {plan.notes}
          </p>
        )}
      </div>

      {plan.imageUrl && (
        <div className="relative aspect-[16/7] bg-muted/30">
          <Image
            src={plan.imageUrl}
            alt={plan.title}
            fill
            className="object-cover"
            sizes="100vw"
            unoptimized={plan.imageUrl.startsWith("/uploads/")}
          />
        </div>
      )}

      <div className="divide-y divide-foreground/10 bg-white">
        {plan.days.map((day) => (
          <div key={day.day} className="p-5 sm:p-6">
            <h3 className="text-sm font-bold uppercase tracking-wider text-primary">
              {day.day}
            </h3>
            <ul className="mt-3 space-y-3">
              {day.meals.map((meal, i) => (
                <li
                  key={i}
                  className="rounded-xl border border-foreground/10 bg-muted/20 p-3 text-sm"
                >
                  <div className="flex flex-wrap items-baseline gap-2">
                    {meal.time && (
                      <span className="font-bold text-primary">{meal.time}</span>
                    )}
                    <span className="font-semibold">{meal.title}</span>
                  </div>
                  {meal.description && (
                    <p className="mt-1 text-foreground/70">{meal.description}</p>
                  )}
                  {meal.items && (
                    <p className="mt-1 text-xs text-foreground/55">
                      {meal.items}
                    </p>
                  )}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </section>
  );
}
