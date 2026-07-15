"use client";

import { createContext, useContext, type ReactNode } from "react";
import { BRAND_PROFILE } from "@/lib/brand-assets";

export type AuthBrandIdentity = {
  photoUrl: string;
  name: string;
  role: string;
};

const DEFAULT_AUTH_BRAND: AuthBrandIdentity = {
  photoUrl: BRAND_PROFILE.professional,
  name: "Lic. María Antonieta Lanza",
  role: "Nutrición · Fitness · Wellness",
};

const AuthBrandContext = createContext<AuthBrandIdentity>(DEFAULT_AUTH_BRAND);

export function AuthBrandProvider({
  value,
  children,
}: {
  value: AuthBrandIdentity;
  children: ReactNode;
}) {
  return (
    <AuthBrandContext.Provider value={value}>{children}</AuthBrandContext.Provider>
  );
}

export function useAuthBrand(): AuthBrandIdentity {
  return useContext(AuthBrandContext);
}
