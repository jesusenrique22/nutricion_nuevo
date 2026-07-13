"use client";

import { useEffect } from "react";

/** Scroll-snap del lobby solo en la portada (`/`). */
export function LandingLobbyShell({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    document.documentElement.classList.add("landing-lobby");
    return () => {
      document.documentElement.classList.remove("landing-lobby");
    };
  }, []);

  return <>{children}</>;
}
