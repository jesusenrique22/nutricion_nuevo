"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { grantResourceAccess } from "@/server/actions/resource.actions";
import { DisplayPrice } from "@/components/currency/display-price";
import type { PendingResourceRequestDTO } from "@/server/actions/resource.queries";

export function PendingResourceRequests({
  requests,
}: {
  requests: PendingResourceRequestDTO[];
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  if (requests.length === 0) return null;

  return (
    <section className="rounded-2xl border border-amber-200 bg-amber-50/50 p-5">
      <h3 className="font-bold">Solicitudes de recursos pendientes</h3>
      <p className="mt-1 text-sm text-foreground/60">
        Verifica el pago y desbloquea el acceso al paciente.
      </p>
      <ul className="mt-4 space-y-3">
        {requests.map((r) => (
          <li
            key={r.id}
            className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-white p-3 ring-1 ring-foreground/10"
          >
            <div>
              <p className="font-semibold">{r.resourceTitle}</p>
              <p className="text-sm text-foreground/60">
                {r.userName} · {r.userEmail} ·{" "}
                <DisplayPrice amount={r.pricePaid} currency="ARS" />
              </p>
            </div>
            <button
              type="button"
              disabled={isPending}
              onClick={() =>
                startTransition(async () => {
                  const res = await grantResourceAccess({
                    userId: r.userId,
                    resourceId: r.resourceId,
                  });
                  if (res.ok) router.refresh();
                  else alert(res.message);
                })
              }
              className="rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-50"
            >
              Desbloquear
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}
