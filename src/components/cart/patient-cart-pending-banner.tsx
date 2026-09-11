import Link from "next/link";
import { DisplayPrice } from "@/components/currency/display-price";
import type { CartItemDTO } from "@/server/actions/cart.actions";

export function PatientCartPendingBanner({
  items,
}: {
  items: CartItemDTO[];
}) {
  const appointments = items.filter(
    (i) => i.type === "APPOINTMENT" || i.type === "APPOINTMENT_REMAINDER",
  );
  if (appointments.length === 0) return null;

  return (
    <div className="mx-auto mt-8 w-full max-w-[344px]">
      <p className="text-center text-xs font-medium uppercase tracking-[0.2em] text-foreground/50">
        En tu carrito
      </p>
      <div className="mt-4 space-y-3">
        {appointments.map((a) => (
          <div
            key={a.id}
            className="rounded-[24px] border border-primary/20 bg-primary/5 p-4 shadow-sm"
          >
            <p className="text-xs font-bold uppercase tracking-wide text-primary">
              {a.type === "APPOINTMENT_REMAINDER"
                ? "Saldo de cita en carrito"
                : "Cita pendiente de pago"}
            </p>
            <p className="mt-1 font-semibold">{a.title}</p>
            <p className="mt-1 text-sm text-foreground/60">{a.subtitle}</p>
            {a.price && (
              <p className="mt-2 text-sm font-bold text-primary">
                <DisplayPrice amount={a.price} currency="ARS" />
              </p>
            )}
          </div>
        ))}
        <Link
          href="/dashboard/patient/cart"
          className="block rounded-full bg-primary py-3 text-center text-sm font-semibold text-primary-foreground"
        >
          Ir al carrito y confirmar
        </Link>
      </div>
    </div>
  );
}
