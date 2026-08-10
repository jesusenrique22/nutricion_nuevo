"use client";

import { useEffect } from "react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[global]", error);
  }, [error]);

  return (
    <html lang="es">
      <body
        style={{
          margin: 0,
          minHeight: "100svh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontFamily:
            "ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, sans-serif",
          background: "#0f3d2e",
          color: "#f5f5f0",
          padding: "1.5rem",
          textAlign: "center",
        }}
      >
        <div>
          <p
            style={{
              margin: 0,
              fontSize: "0.7rem",
              fontWeight: 600,
              letterSpacing: "0.28em",
              textTransform: "uppercase",
              opacity: 0.75,
            }}
          >
            Anttova
          </p>
          <h1 style={{ margin: "0.75rem 0 0", fontSize: "1.5rem" }}>
            Algo salió mal
          </h1>
          <p style={{ margin: "0.75rem auto 0", maxWidth: "28rem", opacity: 0.8 }}>
            No pudimos mostrar la página. Probá de nuevo.
          </p>
          <button
            type="button"
            onClick={reset}
            style={{
              marginTop: "1.75rem",
              border: 0,
              borderRadius: "999px",
              background: "#f5f5f0",
              color: "#0f3d2e",
              padding: "0.65rem 1.5rem",
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            Reintentar
          </button>
        </div>
      </body>
    </html>
  );
}
