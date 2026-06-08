import Link from "next/link";
import { redirect } from "next/navigation";
import { auth, signOut } from "@/lib/auth";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const isAdmin = session.user.role === "ADMIN";

  const adminLinks = [
    { href: "/dashboard/admin/calendar", label: "Calendario" },
    { href: "/dashboard/admin/patients", label: "Pacientes" },
    { href: "/dashboard/admin/analytics", label: "Estadísticas" },
    { href: "/dashboard/admin/resources", label: "Recursos" },
  ];
  const patientLinks = [
    { href: "/dashboard/patient/appointments", label: "Mis citas" },
    { href: "/dashboard/patient/progress", label: "Mi progreso" },
    { href: "/dashboard/patient/library", label: "Mi librería" },
  ];
  const links = isAdmin ? adminLinks : patientLinks;

  return (
    <div className="flex min-h-screen">
      <aside className="hidden w-64 flex-col border-r border-foreground/10 bg-white p-6 md:flex">
        <Link href="/dashboard" className="text-xl font-extrabold text-primary">
          NutriVida
        </Link>
        <span className="mt-1 text-xs font-semibold text-foreground/40">
          {isAdmin ? "Panel Nutricionista" : "Panel Paciente"}
        </span>

        <nav className="mt-8 flex flex-1 flex-col gap-1">
          <Link
            href="/dashboard"
            className="rounded-xl px-4 py-2.5 font-semibold hover:bg-muted"
          >
            Inicio
          </Link>
          {links.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className="rounded-xl px-4 py-2.5 font-semibold hover:bg-muted"
            >
              {l.label}
            </Link>
          ))}
          <Link
            href="/dashboard/chat"
            className="rounded-xl px-4 py-2.5 font-semibold hover:bg-muted"
          >
            Chat
          </Link>
        </nav>

        <form
          action={async () => {
            "use server";
            await signOut({ redirectTo: "/" });
          }}
        >
          <button className="w-full rounded-xl px-4 py-2.5 text-left font-semibold text-red-600 hover:bg-red-50">
            Cerrar sesión
          </button>
        </form>
      </aside>

      <main className="flex-1 bg-background p-8">{children}</main>
    </div>
  );
}
