"use client";

import { AnimatePresence, motion } from "framer-motion";
import {
  CloseIcon,
  InfoIcon,
  WarningIcon,
} from "@/components/ui/link-icons";

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
            <span className="shrink-0">
              {variant === "error" ? (
                <WarningIcon className="h-5 w-5 text-red-600" />
              ) : (
                <InfoIcon className="h-5 w-5 text-primary" />
              )}
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
              className="shrink-0 rounded-full p-1 opacity-60 transition hover:opacity-100"
              aria-label="Cerrar"
            >
              <CloseIcon className="h-4 w-4" />
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
