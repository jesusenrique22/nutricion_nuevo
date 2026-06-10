"use client";

import { AnimatePresence, motion } from "framer-motion";

export function ChatNotice({
  message,
  variant = "error",
  onClose,
}: {
  message: string | null;
  variant?: "error" | "info";
  onClose: () => void;
}) {
  return (
    <AnimatePresence>
      {message && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 8 }}
          className="absolute inset-x-4 top-4 z-20"
        >
          <div
            role="alert"
            className={`flex items-start gap-3 rounded-2xl border px-4 py-3 shadow-lg ${
              variant === "error"
                ? "border-red-200 bg-red-50 text-red-900"
                : "border-primary/15 bg-white text-foreground"
            }`}
          >
            <span className="text-lg leading-none">
              {variant === "error" ? "⚠️" : "ℹ️"}
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold">
                {variant === "error" ? "No se pudo enviar" : "Aviso"}
              </p>
              <p className="mt-0.5 text-sm opacity-90">{message}</p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="shrink-0 rounded-full px-2 py-1 text-sm font-semibold opacity-60 transition hover:opacity-100"
              aria-label="Cerrar"
            >
              ✕
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
