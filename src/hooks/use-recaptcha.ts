"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { RECAPTCHA_ACTION_BOOK } from "@/lib/recaptcha-constants";
import { getPublicRecaptchaSite } from "@/lib/recaptcha-env";

declare global {
  interface Window {
    grecaptcha?: {
      ready: (cb: () => void) => void;
      execute: (
        siteKey: string,
        options: { action: string },
      ) => Promise<string>;
      enterprise?: {
        ready: (cb: () => void) => void;
        execute: (
          siteKey: string,
          options: { action: string },
        ) => Promise<string>;
      };
    };
  }
}

function scriptSrc(siteKey: string, enterprise: boolean): string {
  const file = enterprise ? "enterprise.js" : "api.js";
  return `https://www.google.com/recaptcha/${file}?render=${siteKey}`;
}

function whenReady(enterprise: boolean, resolve: () => void): void {
  if (enterprise && window.grecaptcha?.enterprise) {
    window.grecaptcha.enterprise.ready(() => resolve());
    return;
  }
  window.grecaptcha?.ready(() => resolve());
}

function loadRecaptchaScript(
  siteKey: string,
  enterprise: boolean,
): Promise<void> {
  if (!siteKey) return Promise.resolve();

  const marker = enterprise ? "enterprise.js" : "api.js";
  const existing = document.querySelector<HTMLScriptElement>(
    `script[src*="${marker}"]`,
  );

  if (window.grecaptcha && (!enterprise || window.grecaptcha.enterprise)) {
    return new Promise((resolve) => whenReady(enterprise, resolve));
  }

  if (existing) {
    return new Promise((resolve) => whenReady(enterprise, resolve));
  }

  return new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = scriptSrc(siteKey, enterprise);
    script.async = true;
    script.onload = () => whenReady(enterprise, resolve);
    script.onerror = () => reject(new Error("recaptcha_load_failed"));
    document.head.appendChild(script);
  });
}

async function executeRecaptcha(
  siteKey: string,
  action: string,
  enterprise: boolean,
): Promise<string> {
  if (enterprise) {
    if (!window.grecaptcha?.enterprise) {
      throw new Error("recaptcha_enterprise_missing");
    }
    return window.grecaptcha.enterprise.execute(siteKey, { action });
  }
  if (!window.grecaptcha) {
    throw new Error("recaptcha_missing");
  }
  return window.grecaptcha.execute(siteKey, { action });
}

export function useRecaptcha(
  action: string = RECAPTCHA_ACTION_BOOK,
  active = true,
) {
  const siteKey = useMemo(() => getPublicRecaptchaSite(), []);
  const enterprise = useMemo(
    () => process.env.NEXT_PUBLIC_RECAPTCHA_ENTERPRISE === "true",
    [],
  );
  const [ready, setReady] = useState(false);
  const [loadFailed, setLoadFailed] = useState(false);
  const enabled = Boolean(siteKey);

  useEffect(() => {
    if (!enabled || !active) return;

    let cancelled = false;
    setLoadFailed(false);
    loadRecaptchaScript(siteKey, enterprise)
      .then(() => {
        if (!cancelled) setReady(true);
      })
      .catch(() => {
        if (!cancelled) {
          setReady(false);
          setLoadFailed(true);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [enabled, active, siteKey, enterprise]);

  const getToken = useCallback(async (): Promise<string | null> => {
    if (!enabled || !ready) return null;

    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        return await executeRecaptcha(siteKey, action, enterprise);
      } catch (err) {
        if (process.env.NODE_ENV === "development") {
          console.warn("[recaptcha] execute attempt failed:", attempt + 1, err);
        }
        if (attempt < 2) {
          await new Promise((r) => setTimeout(r, 400));
        }
      }
    }
    return null;
  }, [enabled, ready, action, siteKey, enterprise]);

  return { enabled, ready, loadFailed, getToken };
}
