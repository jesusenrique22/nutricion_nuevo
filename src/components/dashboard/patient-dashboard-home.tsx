"use client";

import Image from "next/image";
import Link from "next/link";
import {
  BrandDashboardHeader,
  BrandQuickLinks,
  BrandRecipePanel,
  BrandStatGrid,
} from "@/components/brand/brand-dashboard-shell";
import { BRAND_PLANS } from "@/lib/brand-assets";

export function PatientDashboardHome({
  userName,
  pendingForms,
  upcomingAppointments,
  unreadNotifications,
}: {
  userName: string;
  pendingForms: number;
  upcomingAppointments: number;
  unreadNotifications: number;
}) {
  const firstName = userName.split(" ")[0] ?? userName;

  const quickLinks = [
    {
      index: "01",
      href: "/dashboard/patient/appointments",
      title: "Agendar cita",
      desc: "Nutrición, entrenamiento o antropometría",
    },
    {
      index: "02",
      href: "/dashboard/patient/progress",
      title: "Estadísticas",
      desc: "Peso, grasa corporal y evolución ISAK",
    },
    {
      index: "03",
      href: "/dashboard/patient/library",
      title: "Plan alimentación",
      desc: "Guía semanal y recursos nutricionales",
    },
    {
      index: "04",
      href: "/dashboard/patient/appointments/form",
      title:
        pendingForms > 0
          ? `Formularios pendientes (${pendingForms})`
          : "Mis formularios",
      desc: "Ingreso y seguimiento clínico",
    },
    {
      index: "05",
      href: "/nutricionista",
      title: "Conoce a Anttova",
      desc: "Lic. Ma Antonieta Lanza",
    },
  ];

  return (
    <div className="mx-auto max-w-5xl space-y-10 pb-2">
      <BrandDashboardHeader
        title={`Hola, ${firstName}`}
        description="Panel paciente · citas, estadísticas, planes y seguimiento en un solo lugar."
        action={
          unreadNotifications > 0
            ? {
                href: "/dashboard/notifications",
                label: `${unreadNotifications} notificaciones`,
              }
            : undefined
        }
      />

      <BrandStatGrid
        items={[
          { label: "Próximas citas", value: upcomingAppointments },
          { label: "Formularios pendientes", value: pendingForms },
          { label: "Notificaciones", value: unreadNotifications },
        ]}
      />

      <BrandRecipePanel />

      <BrandQuickLinks items={quickLinks} />

      <section className="overflow-hidden rounded-3xl ring-1 ring-primary/10">
        <div className="grid md:grid-cols-2">
          <div className="flex flex-col justify-center bg-gradient-to-br from-accent-soft/35 to-muted/20 p-6 sm:p-8">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-foreground/50">
              Plan alimentación
            </p>
            <h2 className="mt-2 text-2xl font-extralight uppercase text-primary">
              Tu guía semanal
            </h2>
            <p className="mt-3 text-sm leading-relaxed text-foreground/65">
              Tras tu consulta nutricional verás recomendaciones, recetas y
              ajustes personalizados.
            </p>
            <Link
              href="/dashboard/patient/library"
              className="mt-5 inline-flex w-fit rounded-full border border-primary px-6 py-2.5 text-sm font-semibold uppercase tracking-wider text-primary transition hover:bg-primary hover:text-primary-foreground"
            >
              Empecemos
            </Link>
          </div>
          <div className="relative min-h-[220px] bg-primary/5">
            <Image
              src={BRAND_PLANS.nutrition}
              alt="Plan de alimentación"
              fill
              className="object-cover object-top"
              sizes="(max-width: 768px) 100vw, 50vw"
            />
          </div>
        </div>
      </section>

      <div className="grid gap-4 pb-2 sm:grid-cols-2">
        {[
          {
            title: "Plan entrenamiento",
            image: BRAND_PLANS.training,
            href: "/dashboard/patient/progress",
          },
          {
            title: "Análisis antropométrico",
            image: BRAND_PLANS.anthropometry,
            href: "/dashboard/patient/progress",
          },
        ].map((item) => (
          <Link
            key={item.title}
            href={item.href}
            className="group overflow-hidden rounded-3xl ring-1 ring-primary/10 transition hover:-translate-y-0.5 hover:shadow-lg"
          >
            <div className="relative aspect-[2/1] bg-muted/20">
              <Image
                src={item.image}
                alt={item.title}
                fill
                className="object-cover object-top transition duration-500 group-hover:scale-[1.02]"
                sizes="(max-width: 768px) 100vw, 50vw"
              />
            </div>
            <p className="bg-surface px-5 py-4 text-sm font-bold uppercase tracking-wide text-primary">
              {item.title}
            </p>
          </Link>
        ))}
      </div>
    </div>
  );
}
