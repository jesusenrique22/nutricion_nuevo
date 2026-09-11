"use client";

import { useEffect, useId, useRef, useState, useTransition } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { LoadingButton } from "@/components/ui/loading-button";
import {
  deactivatePatientAccount,
  permanentlyDeletePatientAccount,
} from "@/server/actions/patient-list.actions";

type DeleteMode = "choose" | "deactivate" | "permanent";

export function DeletePatientAccountButton({
  patientId,
  patientName,
  patientEmail,
  redirectTo,
  className = "text-sm font-semibold text-red-600 hover:underline disabled:opacity-50",
}: {
  patientId: string;
  patientName: string;
  patientEmail?: string;
  redirectTo?: string;
  className?: string;
}) {
  const router = useRouter();
  const titleId = useId();
  const descriptionId = useId();
  const confirmRef = useRef<HTMLButtonElement>(null);
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<DeleteMode>("choose");
  const [confirmText, setConfirmText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const permanentConfirmOk =
    confirmText.trim().toUpperCase() === "ELIMINAR" ||
    (!!patientEmail &&
      confirmText.trim().toLowerCase() === patientEmail.trim().toLowerCase());

  useEffect(() => {
    if (!open) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    confirmRef.current?.focus();

    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape" && !isPending) handleClose();
    }

    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = previous;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [open, isPending]);

  function handleClose() {
    if (isPending) return;
    setOpen(false);
    setMode("choose");
    setConfirmText("");
    setError(null);
  }

  function handleConfirm() {
    setError(null);
    startTransition(async () => {
      const res =
        mode === "permanent"
          ? await permanentlyDeletePatientAccount(patientId)
          : await deactivatePatientAccount(patientId);

      if (!res.ok) {
        setError(res.message);
        return;
      }

      handleClose();
      if (redirectTo) router.push(redirectTo);
      else router.refresh();
    });
  }

  const dialogContent = (() => {
    if (mode === "choose") {
      return {
        title: "¿Qué querés hacer con esta cuenta?",
        description: `Elegí cómo gestionar la cuenta de ${patientName}.`,
        notice: undefined,
        confirmLabel: undefined,
        body: (
          <div className="mt-4 space-y-3">
            <button
              type="button"
              disabled={isPending}
              onClick={() => setMode("deactivate")}
              className="w-full rounded-2xl border border-foreground/10 bg-white px-4 py-4 text-left transition hover:border-primary/25 hover:bg-primary/5 disabled:opacity-50"
            >
              <p className="font-semibold text-foreground">Desactivar cuenta</p>
              <p className="mt-1 text-sm text-foreground/65">
                El paciente no podrá ingresar ni volver a registrarse con el
                mismo email. Su historial, citas y formularios se conservan.
              </p>
            </button>

            <button
              type="button"
              disabled={isPending}
              onClick={() => setMode("permanent")}
              className="w-full rounded-2xl border border-red-200 bg-red-50/70 px-4 py-4 text-left transition hover:border-red-300 hover:bg-red-50 disabled:opacity-50"
            >
              <p className="font-semibold text-red-700">
                Borrar permanentemente
              </p>
              <p className="mt-1 text-sm text-red-700/80">
                Elimina al paciente y todos sus datos de la base de datos. El
                email queda libre para registrarse de nuevo. Esta acción no se
                puede deshacer.
              </p>
            </button>
          </div>
        ),
        showActions: false,
      };
    }

    if (mode === "deactivate") {
      return {
        title: "¿Desactivar esta cuenta?",
        description: `Vas a desactivar la cuenta de ${patientName}.`,
        notice:
          "El paciente no podrá iniciar sesión ni registrarse otra vez con el mismo email. Los datos clínicos y de pagos se conservan en la base de datos.",
        confirmLabel: "Sí, desactivar cuenta",
        body: null,
        showActions: true,
        variant: "danger" as const,
        confirmDisabled: false,
      };
    }

    return {
      title: "¿Borrar permanentemente?",
      description: `Vas a eliminar por completo la cuenta de ${patientName} y todos sus datos.`,
      notice:
        "Se borrarán citas, formularios, compras, notificaciones y pagos vinculados. Esta acción es irreversible.",
      confirmLabel: "Sí, borrar permanentemente",
      body: (
        <label className="mt-4 block space-y-2">
          <span className="text-sm text-foreground/70">
            Escribí <strong>ELIMINAR</strong>
            {patientEmail ? " o el email del paciente" : ""} para confirmar:
          </span>
          <input
            value={confirmText}
            onChange={(e) => setConfirmText(e.target.value)}
            disabled={isPending}
            placeholder={patientEmail ?? "ELIMINAR"}
            className="w-full rounded-xl border border-foreground/15 bg-white px-3 py-2.5 text-sm outline-none focus:border-primary disabled:opacity-50"
          />
        </label>
      ),
      showActions: true,
      variant: "danger" as const,
      confirmDisabled: !permanentConfirmOk,
    };
  })();

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

      {open &&
        typeof document !== "undefined" &&
        createPortal(
          <div
            className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6"
            role="presentation"
          >
            <button
              type="button"
              aria-label="Cerrar"
              disabled={isPending}
              onClick={handleClose}
              className="absolute inset-0 bg-primary/45 backdrop-blur-[3px]"
            />

            <div
              role="alertdialog"
              aria-modal="true"
              aria-labelledby={titleId}
              aria-describedby={descriptionId}
              className="relative w-full max-w-md overflow-hidden rounded-3xl bg-surface shadow-2xl ring-1 ring-primary/15"
            >
              <div className="bg-gradient-to-br from-primary/8 via-surface to-accent-soft/20 px-6 pt-6 pb-5">
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-primary/60">
                  Anttova
                </p>
                <h2 id={titleId} className="mt-2 text-xl font-bold text-primary">
                  {dialogContent.title}
                </h2>
              </div>

              <div className="px-6 py-5">
                <p
                  id={descriptionId}
                  className="text-sm leading-relaxed text-foreground/75"
                >
                  {dialogContent.description}
                </p>
                {dialogContent.notice && (
                  <p className="mt-4 rounded-2xl border border-primary/10 bg-muted/40 px-4 py-3 text-sm text-foreground/70">
                    {dialogContent.notice}
                  </p>
                )}
                {dialogContent.body}

                {error && (
                  <p className="mt-4 text-sm text-red-600" role="alert">
                    {error}
                  </p>
                )}

                <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                  <button
                    type="button"
                    disabled={isPending}
                    onClick={
                      mode === "choose" ? handleClose : () => setMode("choose")
                    }
                    className="rounded-full border border-foreground/15 px-5 py-2.5 text-sm font-semibold text-foreground/80 transition hover:bg-muted/50 disabled:opacity-50"
                  >
                    {mode === "choose" ? "Cancelar" : "← Volver"}
                  </button>

                  {dialogContent.showActions && (
                    <LoadingButton
                      ref={confirmRef}
                      type="button"
                      loading={isPending}
                      loadingLabel="Procesando…"
                      indicatorVariant="onPrimary"
                      disabled={dialogContent.confirmDisabled}
                      onClick={handleConfirm}
                      className="rounded-full bg-red-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-red-700 disabled:opacity-50"
                    >
                      {dialogContent.confirmLabel}
                    </LoadingButton>
                  )}
                </div>
              </div>
            </div>
          </div>,
          document.body,
        )}

      {error && !open && (
        <p className="mt-1 text-xs text-red-600" role="alert">
          {error}
        </p>
      )}
    </>
  );
}
