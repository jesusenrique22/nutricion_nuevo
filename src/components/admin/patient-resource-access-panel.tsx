"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { DisplayPrice } from "@/components/currency/display-price";
import type { ResourceDTO } from "@/server/actions/resource.queries";
import type { PatientFichaPurchase } from "@/server/actions/patient.queries";
import {
  grantResourceAccess,
  revokeResourceAccess,
} from "@/server/actions/resource.actions";
import { approveResourcePayment } from "@/server/actions/payment-admin.actions";

const statusLabels: Record<string, string> = {
  PENDING: "Procesando",
  GRANTED: "Activo",
  REFUNDED: "Revocado",
};

const statusStyles: Record<string, string> = {
  PENDING: "bg-amber-50 text-amber-700",
  GRANTED: "bg-green-50 text-green-700",
  REFUNDED: "bg-foreground/10 text-foreground/50",
};

export function PatientResourceAccessPanel({
  patientId,
  purchases,
  catalog,
}: {
  patientId: string;
  purchases: PatientFichaPurchase[];
  catalog: ResourceDTO[];
}) {
  const router = useRouter();
  const [resourceId, setResourceId] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const grantable = catalog.filter(
    (r) => r.accessStatus !== "GRANTED" && r.accessStatus !== "PENDING",
  );

  function run(fn: () => Promise<{ ok: boolean; message?: string }>) {
    setMessage(null);
    startTransition(async () => {
      const res = await fn();
      if (!res.ok) {
        setMessage(res.message ?? "No se pudo completar la acción.");
        return;
      }
      router.refresh();
    });
  }

  function handleGrant(e: React.FormEvent) {
    e.preventDefault();
    if (!resourceId) return;
    run(() =>
      grantResourceAccess({ userId: patientId, resourceId }),
    );
  }

  return (
    <div className="space-y-4">
      {grantable.length > 0 && (
        <form
          onSubmit={handleGrant}
          className="flex flex-col gap-3 rounded-xl border border-foreground/10 bg-muted/30 p-4 sm:flex-row sm:items-end"
        >
          <div className="min-w-0 flex-1">
            <label className="text-xs font-semibold text-foreground/60">
              Desbloquear recurso del catálogo
            </label>
            <select
              value={resourceId}
              onChange={(e) => setResourceId(e.target.value)}
              className="mt-1 w-full rounded-xl border border-foreground/15 bg-white px-3 py-2 text-sm outline-none focus:border-primary"
              required
            >
              <option value="">Elegir recurso…</option>
              {grantable.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.title} · {r.price === "0" ? "Gratis" : `$${r.price}`}
                </option>
              ))}
            </select>
          </div>
          <button
            type="submit"
            disabled={isPending || !resourceId}
            className="shrink-0 rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-50"
          >
            {isPending ? "…" : "Desbloquear"}
          </button>
        </form>
      )}

      {purchases.length === 0 ? (
        <p className="text-sm text-foreground/50">
          Este paciente aún no tiene recursos en su historial.
        </p>
      ) : (
        <div className="space-y-3">
          {purchases.map((p) => (
            <article
              key={p.id}
              className="flex flex-wrap items-start justify-between gap-3 rounded-xl border border-foreground/10 p-4"
            >
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span
                    className={`rounded-full px-2.5 py-1 text-[10px] font-bold uppercase ${
                      statusStyles[p.status] ?? "bg-muted"
                    }`}
                  >
                    {statusLabels[p.status] ?? p.status}
                  </span>
                </div>
                <h3 className="mt-2 font-semibold">{p.title}</h3>
                <p className="mt-1 text-xs text-foreground/50">
                  Registrado el{" "}
                  {new Date(p.purchasedAt).toLocaleDateString("es")}
                </p>
              </div>
              <div className="flex flex-col items-end gap-2">
                <p className="text-lg font-bold text-primary">
                  <DisplayPrice amount={p.pricePaid} currency="ARS" />
                </p>
                {p.status === "PENDING" && (
                  <button
                    type="button"
                    disabled={isPending}
                    onClick={() =>
                      run(() =>
                        approveResourcePayment({ purchaseId: p.id }),
                      )
                    }
                    className="text-xs font-semibold text-primary hover:underline disabled:opacity-50"
                  >
                    Confirmar pago y desbloquear
                  </button>
                )}
                {p.status === "GRANTED" && (
                  <button
                    type="button"
                    disabled={isPending}
                    onClick={() =>
                      run(() =>
                        revokeResourceAccess({
                          userId: patientId,
                          resourceId: p.resourceId,
                        }),
                      )
                    }
                    className="text-xs font-semibold text-red-600 hover:underline disabled:opacity-50"
                  >
                    Quitar acceso
                  </button>
                )}
              </div>
            </article>
          ))}
        </div>
      )}

      {message && (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">
          {message}
        </p>
      )}
    </div>
  );
}
