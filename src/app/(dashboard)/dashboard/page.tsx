import { auth } from "@/lib/auth";

export default async function DashboardHome() {
  const session = await auth();
  const name = session?.user?.name ?? "";

  return (
    <div>
      <h1 className="text-3xl font-bold">Hola, {name} 👋</h1>
      <p className="mt-2 text-foreground/60">
        Este es tu panel. Usa el menú lateral para navegar.
      </p>

      <div className="mt-8 grid gap-4 sm:grid-cols-3">
        {["Próximas citas", "Mensajes sin leer", "Notificaciones"].map((t) => (
          <div
            key={t}
            className="rounded-2xl border border-foreground/10 bg-white p-6"
          >
            <span className="text-sm text-foreground/50">{t}</span>
            <div className="mt-2 text-3xl font-extrabold text-primary">0</div>
          </div>
        ))}
      </div>
    </div>
  );
}
