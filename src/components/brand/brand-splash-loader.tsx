"use client";

import { useEffect, useLayoutEffect, useState } from "react";
import { usePathname } from "next/navigation";
import Image from "next/image";

const SESSION_KEY = "anttova-splash-seen";
const MIN_MS = 1500;
const MAX_MS = 4200;
const EXIT_MS = 780;

type Phase = "show" | "exit" | "done";

/**
 * Splash de marca al abrir el lobby: cubre la carga de imágenes/hero
 * y se retira con una salida suave. Una vez por pestaña (sessionStorage).
 */
export function BrandSplashLoader() {
  const pathname = usePathname();
  const isHome = pathname === "/";
  // Mismo valor en SSR y 1er paint → sin mismatch de hidratación
  const [phase, setPhase] = useState<Phase>(isHome ? "show" : "done");

  useLayoutEffect(() => {
    if (!isHome) {
      setPhase("done");
      return;
    }
    try {
      if (sessionStorage.getItem(SESSION_KEY)) {
        setPhase("done");
      } else {
        setPhase("show");
      }
    } catch {
      setPhase("show");
    }
  }, [isHome]);

  useEffect(() => {
    if (!isHome) return;

    try {
      if (sessionStorage.getItem(SESSION_KEY)) return;
    } catch {
      /* ignore */
    }

    const start = Date.now();
    let finished = false;
    let exitTimer = 0;
    let maxTimer = 0;
    let minWaitTimer = 0;
    let pollTimer = 0;

    const markSeen = () => {
      try {
        sessionStorage.setItem(SESSION_KEY, "1");
      } catch {
        /* ignore */
      }
    };

    const beginExit = () => {
      if (finished) return;
      finished = true;
      const elapsed = Date.now() - start;
      const wait = Math.max(0, MIN_MS - elapsed);
      minWaitTimer = window.setTimeout(() => {
        setPhase("exit");
        markSeen();
        exitTimer = window.setTimeout(() => setPhase("done"), EXIT_MS);
      }, wait);
    };

    const waitForHeroImages = (): Promise<void> =>
      new Promise((resolve) => {
        let settled = false;
        const finish = () => {
          if (settled) return;
          settled = true;
          resolve();
        };

        const tryCollect = () => {
          const nodes = Array.from(
            document.querySelectorAll<HTMLImageElement>(
              '#inicio img, img[fetchpriority="high"]',
            ),
          );
          if (nodes.length === 0) return false;
          Promise.all(
            nodes.map(
              (img) =>
                new Promise<void>((r) => {
                  if (img.complete && img.naturalWidth > 0) {
                    r();
                    return;
                  }
                  const done = () => r();
                  img.addEventListener("load", done, { once: true });
                  img.addEventListener("error", done, { once: true });
                }),
            ),
          ).then(finish);
          return true;
        };

        if (!tryCollect()) {
          pollTimer = window.setTimeout(() => {
            if (!tryCollect()) finish();
          }, 500);
        }
      });

    const onWindowReady = () => {
      void waitForHeroImages().then(beginExit);
    };

    if (document.readyState === "complete") {
      onWindowReady();
    } else {
      window.addEventListener("load", onWindowReady, { once: true });
    }

    maxTimer = window.setTimeout(beginExit, MAX_MS);
    document.documentElement.classList.add("anttova-splash-lock");

    return () => {
      finished = true;
      window.clearTimeout(minWaitTimer);
      window.clearTimeout(exitTimer);
      window.clearTimeout(maxTimer);
      window.clearTimeout(pollTimer);
      window.removeEventListener("load", onWindowReady);
      document.documentElement.classList.remove("anttova-splash-lock");
    };
  }, [isHome]);

  useEffect(() => {
    if (phase === "show") {
      document.documentElement.classList.add("anttova-splash-lock");
    } else {
      document.documentElement.classList.remove("anttova-splash-lock");
    }
  }, [phase]);

  if (phase === "done" || !isHome) return null;

  return (
    <div
      className={`anttova-splash ${phase === "exit" ? "anttova-splash--exit" : ""}`}
      role="status"
      aria-live="polite"
      aria-label="Cargando Anttova"
    >
      <div className="anttova-splash__glow anttova-splash__glow--a" aria-hidden />
      <div className="anttova-splash__glow anttova-splash__glow--b" aria-hidden />
      <div className="anttova-splash__sparks" aria-hidden />

      <div className="anttova-splash__inner">
        <p className="anttova-splash__eyebrow">Est. 2025 · Buenos Aires</p>

        <div className="anttova-splash__logo">
          <Image
            src="/brand/logo-white.svg"
            alt="Anttova"
            width={160}
            height={29}
            priority
            className="anttova-splash__logo-img"
          />
        </div>

        <h1 className="anttova-splash__word" aria-hidden>
          {"anttova".split("").map((letter, i) => (
            <span
              key={`${letter}-${i}`}
              className="anttova-splash__letter"
              style={{ animationDelay: `${120 + i * 70}ms` }}
            >
              {letter}
            </span>
          ))}
        </h1>

        <p className="anttova-splash__tag">Nutrición · Fitness · Wellness</p>

        <div className="anttova-splash__bar" aria-hidden>
          <span className="anttova-splash__bar-fill" />
        </div>
      </div>
    </div>
  );
}
