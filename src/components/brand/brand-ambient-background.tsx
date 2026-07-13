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
  color: string;
};

const COLORS_LIGHT = [
  "116,30,49",
  "200,90,130",
  "232,180,200",
  "180,70,110",
];

/**
 * Partículas redondas con deriva tipo agua:
 * el cursor mueve las cercanas en la dirección del gesto (no las atrae).
 */
export function BrandAmbientBackground() {
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
      w = window.innerWidth;
      h = window.innerHeight;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.floor(w * dpr);
      canvas.height = Math.floor(h * dpr);
      canvas.style.width = `${w}px`;
      canvas.style.height = `${h}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      const count = Math.min(240, Math.floor((w * h) / 8500));
      particles = Array.from({ length: count }, () => ({
        x: Math.random() * w,
        y: Math.random() * h,
        r: 1.2 + Math.random() * 2.6,
        vx: (Math.random() - 0.5) * 0.28,
        vy: -0.12 - Math.random() * 0.4,
        baseAlpha: 0.35 + Math.random() * 0.45,
        phase: Math.random() * Math.PI * 2,
        color: COLORS_LIGHT[Math.floor(Math.random() * COLORS_LIGHT.length)]!,
      }));
    };

    const onMove = (e: PointerEvent) => {
      if (mouse.active) {
        mouse.vx = e.clientX - mouse.px;
        mouse.vy = e.clientY - mouse.py;
      }
      mouse.px = e.clientX;
      mouse.py = e.clientY;
      mouse.x = e.clientX;
      mouse.y = e.clientY;
      mouse.active = true;
    };
    const onLeave = () => {
      mouse.active = false;
      mouse.vx = 0;
      mouse.vy = 0;
    };

    let t = 0;
    const tick = () => {
      t += 0.016;
      ctx.clearRect(0, 0, w, h);

      // Decaimiento suave de la “corriente” del cursor
      mouse.vx *= 0.9;
      mouse.vy *= 0.9;

      if (mouse.active && Math.hypot(mouse.vx, mouse.vy) > 0.4) {
        const speed = Math.min(Math.hypot(mouse.vx, mouse.vy), 28);
        const g = ctx.createRadialGradient(
          mouse.x,
          mouse.y,
          0,
          mouse.x,
          mouse.y,
          160,
        );
        g.addColorStop(0, `rgba(242,181,204,${0.12 + speed * 0.004})`);
        g.addColorStop(1, "rgba(242,181,204,0)");
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(mouse.x, mouse.y, 160, 0, Math.PI * 2);
        ctx.fill();
      }

      for (const p of particles) {
        // Flotación tipo corriente lenta
        p.x += p.vx + Math.sin(t * 0.7 + p.phase) * 0.18;
        p.y += p.vy + Math.cos(t * 0.55 + p.phase) * 0.08;

        // Empuje tipo agua en la dirección del mouse (no atracción)
        if (mouse.active) {
          const dx = p.x - mouse.x;
          const dy = p.y - mouse.y;
          const dist = Math.hypot(dx, dy) || 1;
          const radius = 170;
          if (dist < radius) {
            const falloff = 1 - dist / radius;
            const push = falloff * falloff;
            // Empuje en dirección del gesto
            p.x += mouse.vx * push * 0.22;
            p.y += mouse.vy * push * 0.22;
            // Remolino leve perpendicular (sensación de agua)
            p.x += -mouse.vy * push * 0.08;
            p.y += mouse.vx * push * 0.08;
          }
        }

        if (p.y < -10) p.y = h + 10;
        if (p.y > h + 10) p.y = -10;
        if (p.x < -10) p.x = w + 10;
        if (p.x > w + 10) p.x = -10;

        const pulse = 0.65 + 0.35 * Math.sin(t * 1.3 + p.phase);
        const alpha = p.baseAlpha * pulse;

        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${p.color},${alpha})`;
        ctx.fill();

        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r * 2.2, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${p.color},${alpha * 0.22})`;
        ctx.fill();
      }

      raf = requestAnimationFrame(tick);
    };

    resize();
    window.addEventListener("resize", resize);
    window.addEventListener("pointermove", onMove, { passive: true });
    window.addEventListener("pointerleave", onLeave);
    raf = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerleave", onLeave);
    };
  }, [reduced]);

  return (
    <div
      aria-hidden
      className="pointer-events-none fixed inset-0 z-0 overflow-hidden"
      data-ambient="water-stars-v4"
    >
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom,_#faf6f8_0%,_#f2f0ed_55%,_#efe8ea_100%)]" />
      {!reduced && (
        <canvas ref={canvasRef} className="absolute inset-0 h-full w-full" />
      )}
    </div>
  );
}
