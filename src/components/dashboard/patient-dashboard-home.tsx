"use client";

import Link from "next/link";

export function PatientDashboardHome({
  userName,
  upcomingAppointments,
  unreadNotifications,
  cartCount,
}: {
  userName: string;
  upcomingAppointments: number;
  unreadNotifications: number;
  cartCount: number;
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
      href: "/dashboard/patient/library",
      title: "Recursos",
      desc: "Material digital desbloqueado por tu nutricionista",
    },
    {
      index: "03",
      href: "/dashboard/patient/cart",
      title: cartCount > 0 ? `Carrito (${cartCount})` : "Carrito",
      desc: "Solicita recursos y revisa tu pedido",
    },
  ];

  return (
    <div className="mx-auto max-w-5xl space-y-10 pb-2">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-foreground/50">
          Anttova — tu proceso empieza aquí
        </p>
        <h1 className="mt-2 text-3xl font-bold sm:text-4xl">Hola, {firstName}</h1>
        <p className="mt-2 text-foreground/60">
          Panel paciente · citas, recursos y notificaciones en un solo lugar.
        </p>
        {unreadNotifications > 0 && (
          <Link
            href="/dashboard/notifications"
            className="mt-4 inline-block text-sm font-semibold text-accent"
          >
            {unreadNotifications} notificaciones sin leer →
          </Link>
        )}
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="rounded-2xl border border-foreground/10 bg-white p-5">
          <p className="text-xs font-bold uppercase tracking-wider text-foreground/45">
            Próximas citas
          </p>
          <p className="mt-2 text-3xl font-bold text-primary">{upcomingAppointments}</p>
        </div>
        <div className="rounded-2xl border border-foreground/10 bg-white p-5">
          <p className="text-xs font-bold uppercase tracking-wider text-foreground/45">
            Carrito
          </p>
          <p className="mt-2 text-3xl font-bold text-primary">{cartCount}</p>
        </div>
      </div>

      <section>
        <h2 className="text-xs font-bold uppercase tracking-[0.22em] text-foreground/50">
          Accesos
        </h2>
        <div className="mt-4 space-y-3">
          {quickLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="flex items-start gap-4 rounded-2xl border border-foreground/10 bg-white p-4 transition hover:-translate-y-0.5 hover:shadow-md"
            >
              <span className="text-lg font-light text-accent">{link.index}</span>
              <div>
                <p className="font-semibold">{link.title}</p>
                <p className="text-sm text-foreground/55">{link.desc}</p>
              </div>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
