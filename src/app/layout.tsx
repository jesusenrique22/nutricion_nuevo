import { Inter } from "next/font/google";
import type { Metadata, Viewport } from "next";
import "./globals.css";
import { Providers } from "@/components/providers";
import { getPublicExchangeRates } from "@/server/actions/currency.actions";

const inter = Inter({
  variable: "--font-sans",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Anttova — Nutrición · Fitness · Wellness",
  description:
    "Consultas de nutrición, entrenamiento y antropometría con Lic. Ma Antonieta Lanza. Agenda citas, completa tu anamnesis y accede a recursos exclusivos.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const initialRates = await getPublicExchangeRates();

  return (
    <html
      lang="es"
      data-scroll-behavior="smooth"
      className={`${inter.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <head>
        {/* data-* (no className): evita mismatch de hidratación en <html>. */}
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var k='anttova-splash-seen',d=document.documentElement;if(location.pathname==='/'&&!localStorage.getItem(k)){d.setAttribute('data-anttova-splash','boot')}else{d.setAttribute('data-anttova-splash','skip')}}catch(e){document.documentElement.setAttribute('data-anttova-splash','skip')}})();`,
          }}
        />
      </head>
      <body className="min-h-full flex flex-col">
        <Providers initialRates={initialRates}>{children}</Providers>
      </body>
    </html>
  );
}
