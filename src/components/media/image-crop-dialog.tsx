"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

export type ImageCropShape = "circle" | "rect";

type ImageCropDialogProps = {
  open: boolean;
  file: File | null;
  shape?: ImageCropShape;
  /** Ancho / alto del recorte de salida (ej. 16/10 para paquetes). Default 1. */
  cropAspectRatio?: number;
  title?: string;
  onCancel: () => void;
  onConfirm: (cropped: File) => void;
};

/**
 * Ajuste tipo WhatsApp: arrastrá la foto y el círculo/cuadro marca lo que se sube.
 */
export function ImageCropDialog({
  open,
  file,
  shape = "circle",
  cropAspectRatio = 1,
  title = "Ajustar foto",
  onCancel,
  onConfirm,
}: ImageCropDialogProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imgRef = useRef<HTMLImageElement | null>(null);
  const [objectUrl, setObjectUrl] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const dragRef = useRef({
    active: false,
    lastX: 0,
    lastY: 0,
    offsetX: 0,
    offsetY: 0,
    scale: 1,
  });
  const [, bump] = useState(0);

  useEffect(() => {
    if (!open || !file) {
      setObjectUrl(null);
      setReady(false);
      setError(null);
      return;
    }
    const url = URL.createObjectURL(file);
    setObjectUrl(url);
    setReady(false);
    setError(null);
    dragRef.current = {
      active: false,
      lastX: 0,
      lastY: 0,
      offsetX: 0,
      offsetY: 0,
      scale: 1,
    };
    return () => URL.revokeObjectURL(url);
  }, [open, file]);

  useEffect(() => {
    if (!objectUrl) return;
    const img = new Image();
    img.onload = () => {
      imgRef.current = img;
      const { viewW, viewH } = viewSize();
      const fit = Math.max(viewW / img.naturalWidth, viewH / img.naturalHeight);
      dragRef.current.scale = fit * 1.05;
      dragRef.current.offsetX = 0;
      dragRef.current.offsetY = 0;
      setReady(true);
      bump((n) => n + 1);
    };
    img.onerror = () => {
      setError(
        "No se pudo leer la imagen. Probá con JPG/PNG o abrí desde Safari si es HEIC.",
      );
    };
    img.src = objectUrl;
  }, [objectUrl]);

  useEffect(() => {
    if (!ready) return;
    draw();
  });

  function viewSize() {
    const viewW = 320;
    const viewH = Math.round(viewW / Math.max(0.5, cropAspectRatio));
    return { viewW, viewH };
  }

  function draw() {
    const canvas = canvasRef.current;
    const img = imgRef.current;
    if (!canvas || !img) return;
    const { viewW, viewH } = viewSize();
    canvas.width = viewW;
    canvas.height = viewH;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const { offsetX, offsetY, scale } = dragRef.current;
    const w = img.naturalWidth * scale;
    const h = img.naturalHeight * scale;
    const x = viewW / 2 - w / 2 + offsetX;
    const y = viewH / 2 - h / 2 + offsetY;

    ctx.clearRect(0, 0, viewW, viewH);
    ctx.fillStyle = "#1a0a0e";
    ctx.fillRect(0, 0, viewW, viewH);
    ctx.drawImage(img, x, y, w, h);

    const pad = shape === "circle" ? 0 : 12;
    const cropW = shape === "circle" ? Math.min(viewW, viewH) - 16 : viewW - pad * 2;
    const cropH = shape === "circle" ? cropW : viewH - pad * 2;
    const cropX = (viewW - cropW) / 2;
    const cropY = (viewH - cropH) / 2;

    ctx.save();
    ctx.fillStyle = "rgba(0,0,0,0.55)";
    ctx.fillRect(0, 0, viewW, viewH);
    ctx.globalCompositeOperation = "destination-out";
    if (shape === "circle") {
      ctx.beginPath();
      ctx.arc(viewW / 2, viewH / 2, cropW / 2, 0, Math.PI * 2);
      ctx.fill();
    } else {
      ctx.beginPath();
      ctx.roundRect(cropX, cropY, cropW, cropH, 12);
      ctx.fill();
    }
    ctx.restore();

    ctx.save();
    if (shape === "circle") {
      ctx.beginPath();
      ctx.arc(viewW / 2, viewH / 2, cropW / 2, 0, Math.PI * 2);
      ctx.clip();
    } else {
      ctx.beginPath();
      ctx.roundRect(cropX, cropY, cropW, cropH, 12);
      ctx.clip();
    }
    ctx.drawImage(img, x, y, w, h);
    ctx.restore();

    ctx.strokeStyle = "rgba(255,255,255,0.9)";
    ctx.lineWidth = 2;
    if (shape === "circle") {
      ctx.beginPath();
      ctx.arc(viewW / 2, viewH / 2, cropW / 2, 0, Math.PI * 2);
      ctx.stroke();
    } else {
      ctx.beginPath();
      ctx.roundRect(cropX, cropY, cropW, cropH, 12);
      ctx.stroke();
    }
  }

  function onPointerDown(e: React.PointerEvent) {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.setPointerCapture(e.pointerId);
    dragRef.current.active = true;
    dragRef.current.lastX = e.clientX;
    dragRef.current.lastY = e.clientY;
  }

  function onPointerMove(e: React.PointerEvent) {
    if (!dragRef.current.active) return;
    const dx = e.clientX - dragRef.current.lastX;
    const dy = e.clientY - dragRef.current.lastY;
    dragRef.current.lastX = e.clientX;
    dragRef.current.lastY = e.clientY;
    dragRef.current.offsetX += dx;
    dragRef.current.offsetY += dy;
    bump((n) => n + 1);
  }

  function onPointerUp(e: React.PointerEvent) {
    dragRef.current.active = false;
    try {
      canvasRef.current?.releasePointerCapture(e.pointerId);
    } catch {
      /* ignore */
    }
  }

  function zoom(delta: number) {
    dragRef.current.scale = Math.min(
      6,
      Math.max(0.2, dragRef.current.scale * delta),
    );
    bump((n) => n + 1);
  }

  async function confirm() {
    const img = imgRef.current;
    if (!img || !file) return;
    setBusy(true);
    setError(null);
    try {
      const { viewW, viewH } = viewSize();
      const outW = Math.round(1280);
      const outH = Math.round(outW / Math.max(0.5, cropAspectRatio));
      const out = document.createElement("canvas");
      out.width = outW;
      out.height = outH;
      const ctx = out.getContext("2d");
      if (!ctx) throw new Error("No se pudo preparar el recorte.");

      const scaleFactor = outW / viewW;
      const { offsetX, offsetY, scale } = dragRef.current;
      const w = img.naturalWidth * scale * scaleFactor;
      const h = img.naturalHeight * scale * scaleFactor;
      const x = outW / 2 - w / 2 + offsetX * scaleFactor;
      const y = outH / 2 - h / 2 + offsetY * scaleFactor;

      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, outW, outH);
      ctx.drawImage(img, x, y, w, h);

      const blob = await new Promise<Blob | null>((resolve) =>
        out.toBlob(resolve, "image/jpeg", 0.9),
      );
      if (!blob) throw new Error("No se pudo generar el JPG.");

      const stem = file.name.replace(/\.[^.]+$/, "") || "foto";
      onConfirm(
        new File([blob], `${stem}.jpg`, {
          type: "image/jpeg",
          lastModified: Date.now(),
        }),
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al recortar");
    } finally {
      setBusy(false);
    }
  }

  if (!open || typeof document === "undefined") return null;

  return createPortal(
    <div className="fixed inset-0 z-[130] flex items-center justify-center p-4">
      <button
        type="button"
        className="absolute inset-0 bg-primary/60 backdrop-blur-[3px]"
        aria-label="Cerrar"
        onClick={onCancel}
      />
      <div
        role="dialog"
        aria-modal="true"
        className="relative w-full max-w-md overflow-hidden rounded-3xl bg-surface shadow-2xl ring-1 ring-primary/15"
      >
        <div className="px-5 pt-5 pb-3">
          <h2 className="text-lg font-semibold text-primary">{title}</h2>
          <p className="mt-1 text-sm text-foreground/60">
            Arrastrá para centrar. Lo que queda dentro del{" "}
            {shape === "circle" ? "círculo" : "cuadro"} es lo que se sube.
          </p>
        </div>

        <div className="flex flex-col items-center gap-3 px-5">
          <canvas
            ref={canvasRef}
            className="max-h-[min(70vh,480px)] w-full max-w-md touch-none cursor-grab rounded-2xl active:cursor-grabbing"
            style={{ aspectRatio: `${cropAspectRatio}` }}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onPointerCancel={onPointerUp}
          />
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => zoom(1 / 1.15)}
              className="rounded-full border border-foreground/15 px-3 py-1.5 text-xs font-semibold"
            >
              − Zoom
            </button>
            <button
              type="button"
              onClick={() => zoom(1.15)}
              className="rounded-full border border-foreground/15 px-3 py-1.5 text-xs font-semibold"
            >
              + Zoom
            </button>
          </div>
          {error && <p className="text-xs text-red-600">{error}</p>}
        </div>

        <div className="mt-4 flex justify-end gap-2 border-t border-foreground/10 px-5 py-4">
          <button
            type="button"
            disabled={busy}
            onClick={onCancel}
            className="rounded-full border border-foreground/15 px-4 py-2 text-sm font-semibold disabled:opacity-50"
          >
            Cancelar
          </button>
          <button
            type="button"
            disabled={busy || !ready}
            onClick={() => void confirm()}
            className="rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-50"
          >
            {busy ? "Preparando…" : "Usar esta foto"}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
