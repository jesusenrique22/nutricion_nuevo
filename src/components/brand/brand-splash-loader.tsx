"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import Image from "next/image";

/** Persistente: solo la 1ª visita (mientras el navegador conserve datos del sitio). */
export const SPLASH_STORAGE_KEY = "anttova-splash-seen";

const MIN_MS = 1400;
const MAX_MS = 4200;
const EXIT_MS = 780;

type Phase = "show" | "exit" | "done";

function hasSeenSplash(): boolean {
  try {
    return localStorage.getItem(SPLASH_STORAGE_KEY) === "1";
  } catch {
    return false;
  }
}

function markSplashSeen(): void {
  try {
    localStorage.setItem(SPLASH_STORAGE_KEY, "1");
  } catch {
    /* private mode */
  }
}

function setSplashAttr(value: "boot" | "skip" | "show" | null): void {
  const root = document.documentElement;
  if (value) root.setAttribute("data-anttova-splash", value);
  else root.removeAttribute("data-anttova-splash");
}

function setSplashLock(on: boolean): void {
  const root = document.documentElement;
  if (on) root.setAttribute("data-anttova-splash-lock", "");
  else root.removeAttribute("data-anttova-splash-lock");
}

function clearBootOverlay(): void {
  const root = document.documentElement;
  if (root.getAttribute("data-anttova-splash") === "boot") {
    root.removeAttribute("data-anttova-splash");
  }
  setSplashLock(false);
}

/**
 * Splash solo en la primera carga del lobby.
 * Si ya se vio o las imágenes están en caché → no vuelve a aparecer.
 */
export function BrandSplashLoader() {
  const pathname = usePathname();
  const isHome = pathname === "/";
  // SSR: nunca montar splash (evita flash en recargas siguientes)
  const [phase, setPhase] = useState<Phase>("done");
  const runId = useRef(0);

  useLayoutEffect(() => {
    if (!isHome) {
      setPhase("done");
      clearBootOverlay();
      setSplashAttr("skip");
      return;
    }

    if (hasSeenSplash()) {
      setPhase("done");
      setSplashAttr("skip");
      setSplashLock(false);
      return;
    }

    runId.current += 1;
    setPhase("show");
    setSplashAttr("show");
    setSplashLock(true);
  }, [isHome]);

  useEffect(() => {
    if (!isHome) return;
    if (hasSeenSplash()) return;

    const myRun = runId.current;
    const start = Date.now();
    let finished = false;
    let exitTimer = 0;
    let maxTimer = 0;
    let minWaitTimer = 0;
    let pollTimer = 0;
    let imagesWereCached = false;

    const stillActive = () => myRun === runId.current;

    const beginExit = () => {
      if (finished || !stillActive()) return;
      finished = true;

      const elapsed = Date.now() - start;
      const wait = imagesWereCached ? 0 : Math.max(0, MIN_MS - elapsed);

      minWaitTimer = window.setTimeout(() => {
        if (!stillActive()) return;
        markSplashSeen();
        setSplashAttr("skip");
        setPhase("exit");
        clearBootOverlay();
        exitTimer = window.setTimeout(() => {
          if (stillActive()) setPhase("done");
        }, EXIT_MS);
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

          const allCached = nodes.every(
            (img) => img.complete && img.naturalWidth > 0,
          );
          if (allCached) {
            imagesWereCached = true;
            finish();
            return true;
          }

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
          }, 450);
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

    return () => {
      finished = true;
      window.clearTimeout(minWaitTimer);
      window.clearTimeout(exitTimer);
      window.clearTimeout(maxTimer);
      window.clearTimeout(pollTimer);
      window.removeEventListener("load", onWindowReady);
      setSplashLock(false);
    };
  }, [isHome]);

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
