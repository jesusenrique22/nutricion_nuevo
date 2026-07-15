import { AuthBrandProvider } from "@/components/auth/auth-brand-context";
import { getAuthBranding } from "@/server/queries/auth-branding.queries";

export default async function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const branding = await getAuthBranding();

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
