"use client";

import { useReducedMotion } from "framer-motion";
import { useEffect, useRef } from "react";

type Particle = {
  x: number;
  y: number;
  r: number;
  vx: number;
  vy: number;
  baseAlpha: number;
  phase: number;
};

/** Destellos blancos con empuje tipo agua (fondos oscuros). */
export function DarkSectionSparks({
  count = 80,
  className = "",
}: {
  count?: number;
  className?: string;
}) {
  const reduced = useReducedMotion();
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (reduced) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let particles: Particle[] = [];
    let raf = 0;
    let w = 0;
    let h = 0;
    const mouse = {
      x: -9999,
      y: -9999,
      px: -9999,
      py: -9999,
      vx: 0,
      vy: 0,
      active: false,
    };

    const resize = () => {
      const parent = canvas.parentElement;
      w = parent?.clientWidth || window.innerWidth;
      h = parent?.clientHeight || window.innerHeight;
      const scale = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.floor(w * scale);
      canvas.height = Math.floor(h * scale);
      canvas.style.width = `${w}px`;
      canvas.style.height = `${h}px`;
      ctx.setTransform(scale, 0, 0, scale, 0, 0);

      particles = Array.from({ length: count }, () => ({
        x: Math.random() * w,
        y: Math.random() * h,
        r: 1.4 + Math.random() * 2.8,
        vx: (Math.random() - 0.5) * 0.35,
        vy: -0.18 - Math.random() * 0.5,
        baseAlpha: 0.28 + Math.random() * 0.55,
        phase: Math.random() * Math.PI * 2,
      }));
    };

    const onMove = (e: PointerEvent) => {
      const rect = canvas.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      const inside = x >= 0 && y >= 0 && x <= w && y <= h;
      if (inside && mouse.active) {
        mouse.vx = x - mouse.px;
        mouse.vy = y - mouse.py;
      }
      mouse.px = x;
      mouse.py = y;
      mouse.x = x;
      mouse.y = y;
      mouse.active = inside;
      if (!inside) {
        mouse.vx = 0;
        mouse.vy = 0;
      }
    };

    let t = 0;
    const tick = () => {
      t += 0.016;
      ctx.clearRect(0, 0, w, h);
      mouse.vx *= 0.9;
      mouse.vy *= 0.9;

      for (const p of particles) {
        p.x += p.vx + Math.sin(t * 0.75 + p.phase) * 0.22;
        p.y += p.vy + Math.cos(t * 0.6 + p.phase) * 0.1;

        if (mouse.active) {
          const dx = p.x - mouse.x;
          const dy = p.y - mouse.y;
          const dist = Math.hypot(dx, dy) || 1;
          const radius = 160;
          if (dist < radius) {
            const push = (1 - dist / radius) ** 2;
            p.x += mouse.vx * push * 0.24;
            p.y += mouse.vy * push * 0.24;
            p.x += -mouse.vy * push * 0.09;
            p.y += mouse.vx * push * 0.09;
          }
        }

        if (p.y < -8) p.y = h + 8;
        if (p.y > h + 8) p.y = -8;
        if (p.x < -8) p.x = w + 8;
        if (p.x > w + 8) p.x = -8;

        const alpha =
          p.baseAlpha * (0.55 + 0.45 * Math.sin(t * 1.5 + p.phase));

        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255,255,255,${alpha})`;
        ctx.fill();

        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r * 2.5, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255,255,255,${alpha * 0.2})`;
        ctx.fill();
      }

      raf = requestAnimationFrame(tick);
    };

    resize();
    const ro = new ResizeObserver(resize);
    if (canvas.parentElement) ro.observe(canvas.parentElement);
    window.addEventListener("pointermove", onMove, { passive: true });
    raf = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      window.removeEventListener("pointermove", onMove);
    };
  }, [reduced, count]);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden
      className={`pointer-events-none absolute inset-0 h-full w-full ${className}`}
    />
  );
}
