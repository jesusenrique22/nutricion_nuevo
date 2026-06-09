"use client";

import { useEffect } from "react";
import { LandingAmbientMotion } from "@/components/marketing/landing-ambient";

export function LandingLobbyShell({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    document.documentElement.classList.add("landing-lobby");
    return () => {
      document.documentElement.classList.remove("landing-lobby");
    };
  }, []);

  return (
    <>
      <LandingAmbientMotion />
      <div className="relative z-10 flex flex-col">{children}</div>
    </>
  );
}
