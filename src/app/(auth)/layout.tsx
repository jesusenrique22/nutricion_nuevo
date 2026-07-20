import { AuthBrandProvider } from "@/components/auth/auth-brand-context";
import { preloadCriticalImages } from "@/lib/preload-critical-images";
import { getAuthBranding } from "@/server/queries/auth-branding.queries";

export default async function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const branding = await getAuthBranding();
  preloadCriticalImages([branding.photoUrl]);

  return (
    <AuthBrandProvider
      value={{
        photoUrl: branding.photoUrl,
        name: branding.name,
        role: branding.role,
      }}
    >
      {children}
    </AuthBrandProvider>
  );
}
