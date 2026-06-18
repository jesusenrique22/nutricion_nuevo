"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { hidePatientFromAdminList } from "@/server/actions/patient-list.actions";

export function DeletePatientAccountButton({
  patientId,
  patientName,
  redirectTo,
  className = "text-sm font-semibold text-red-600 hover:underline disabled:opacity-50",
}: {
  patientId: string;
  patientName: string;
  redirectTo?: string;
  className?: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleConfirm() {
    setError(null);
    startTransition(async () => {
      const res = await hidePatientFromAdminList(patientId);
      if (!res.ok) {
        setError(res.message);
        return;
      }
      setOpen(false);
      if (redirectTo) router.push(redirectTo);
      else router.refresh();
    });
  }

  return (
    <>
      <button
        type="button"
        disabled={isPending}
        onClick={() => setOpen(true)}
        className={className}
      >
        Eliminar cuenta
      </button>

      <ConfirmDialog
        open={open}
        onOpenChange={(next) => {
          if (!isPending) setOpen(next);
        }}
        title="¿Eliminar esta cuenta?"
        description={`Vas a eliminar la cuenta de ${patientName} de tu panel. El paciente no podrá iniciar sesión, pero su historial, citas y formularios se conservan en la base de datos.`}
        notice="Esta acción oculta al paciente de tu lista. Los datos no se borran permanentemente."
        confirmLabel="Sí, eliminar cuenta"
        cancelLabel="No, mantener"
        variant="danger"
        loading={isPending}
        onConfirm={handleConfirm}
      />

      {error && (
        <p className="mt-1 text-xs text-red-600" role="alert">
          {error}
        </p>
      )}
    </>
  );
}
