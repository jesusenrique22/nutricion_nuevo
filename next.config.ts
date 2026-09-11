import type { NextConfig } from "next";

const isProduction = process.env.NODE_ENV === "production";

// ── Content Security Policy ───────────────────────────────────────────────────
// unsafe-eval es requerido por next-auth/jwt en dev; en prod se puede quitar
// si no usás `eval` directamente.
const cspDirectives = [
  "default-src 'self'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'self'",
  "object-src 'none'",
  "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://www.google.com https://www.gstatic.com https://www.recaptcha.net",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https://res.cloudinary.com",
  "font-src 'self' data:",
  "connect-src 'self' https://*.upstash.io wss: https://www.google.com https://www.recaptcha.net",
  "frame-src 'self' https://www.google.com https://www.recaptcha.net",
  "worker-src 'self' blob:",
  "manifest-src 'self'",
  "media-src 'self' blob:",
];

const contentSecurityPolicy = cspDirectives.join("; ");

// ── Security headers ──────────────────────────────────────────────────────────
const securityHeaders = [
  // Evita MIME-type sniffing
  { key: "X-Content-Type-Options", value: "nosniff" },
  // Bloquea iframes desde otros orígenes
  { key: "X-Frame-Options", value: "SAMEORIGIN" },
  // Legado anti-XSS (cubierto por CSP, mantenemos por compat)
  { key: "X-XSS-Protection", value: "1; mode=block" },
  // Controla referrer en cross-origin
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  // Permisos de APIs del browser
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=()" },
  // Política de apertura entre orígenes (protege contra Spectre/XS-Leaks)
  { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
  // Política de embeddings (requerido para COEP isolation)
  { key: "Cross-Origin-Embedder-Policy", value: "unsafe-none" },
  // Solo permite recursos del mismo origen salvo explicit allow
  { key: "Cross-Origin-Resource-Policy", value: "same-site" },
  // CSP
  { key: "Content-Security-Policy", value: contentSecurityPolicy },
  // HSTS solo en producción — fuerza HTTPS por 2 años + subdomains
  ...(isProduction
    ? [
        {
          key: "Strict-Transport-Security",
          value: "max-age=63072000; includeSubDomains; preload",
        },
      ]
    : []),
];

const useRecaptchaEnterprise = Boolean(
  process.env.RECAPTCHA_PROJECT_ID?.trim() &&
    process.env.GOOGLE_CLOUD_API_KEY?.trim(),
);

const nextConfig: NextConfig = {
  // Playwright / tests en 127.0.0.1 vs localhost — permitir HMR en dev
  allowedDevOrigins: ["127.0.0.1", "localhost"],

  // No enviar el header "X-Powered-By: Next.js" en producción
  poweredByHeader: false,

  env: {
    NEXT_PUBLIC_RECAPTCHA_ENTERPRISE: useRecaptchaEnterprise ? "true" : "false",
  },

  experimental: {
    serverActions: {
      bodySizeLimit: "50mb",
    },
    ...(isProduction
      ? {
          staleTimes: {
            dynamic: 30,
            static: 300,
          },
        }
      : {}),
  },

  // Imports estáticos en neon-prisma-factory.ts; incluir en el trace de cada función.
  transpilePackages: ["@neondatabase/serverless", "@prisma/adapter-neon", "ws"],

  // Mantener funciones Vercel < 250 MB.
  // googleapis (~202 MB) NO debe entrar en páginas de paciente / medios:
  // el sync de Calendar solo corre en admin + APIs de Google.
  outputFileTracingExcludes: {
    "*": [
      "./node_modules/pdfjs-dist/**",
      "./node_modules/@napi-rs/canvas/**",
    ],
    "/dashboard/patient/**": [
      "./node_modules/googleapis/**",
      "./node_modules/google-auth-library/**",
      "./node_modules/googleapis-common/**",
    ],
    "/dashboard/patient/library/**": [
      "./node_modules/googleapis/**",
      "./node_modules/google-auth-library/**",
      "./node_modules/googleapis-common/**",
      "./node_modules/mongodb/**",
      "./node_modules/bson/**",
      "./node_modules/@mongodb-js/**",
    ],
    "/api/media/**": [
      "./node_modules/googleapis/**",
      "./node_modules/google-auth-library/**",
      "./node_modules/googleapis-common/**",
    ],
    "/api/resources/**": [
      "./node_modules/googleapis/**",
      "./node_modules/google-auth-library/**",
      "./node_modules/googleapis-common/**",
    ],
    "/api/payments/**": [
      "./node_modules/googleapis/**",
      "./node_modules/google-auth-library/**",
      "./node_modules/googleapis-common/**",
    ],
    "/api/secure-file/**": [
      "./node_modules/googleapis/**",
      "./node_modules/google-auth-library/**",
      "./node_modules/googleapis-common/**",
    ],
  },

  serverExternalPackages: [
    "@prisma/client",
    "prisma",
    "mongodb",
    "googleapis",
    "google-auth-library",
    "nodemailer",
  ],

  images: {
    remotePatterns: [
      { protocol: "https", hostname: "res.cloudinary.com" },
    ],
    // Formatos modernos primero — reduce tamaño de imágenes ~30-50 %
    formats: ["image/avif", "image/webp"],
    // Dispositivos comunes: móvil, tablet, escritorio
    deviceSizes: [390, 768, 1024, 1280, 1920],
    imageSizes: [16, 32, 64, 128, 256],
  },

  async headers() {
    return [
      {
        source: "/(.*)",
        headers: securityHeaders,
      },
      {
        // Nombres únicos por upload → cache largo en el browser
        source: "/uploads/:path*",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=31536000, immutable",
          },
        ],
      },
      {
        source: "/brand/:path*",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=86400, stale-while-revalidate=604800",
          },
        ],
      },
      ...(isProduction
        ? [
            {
              source: "/_next/static/(.*)",
              headers: [
                {
                  key: "Cache-Control",
                  value: "public, max-age=31536000, immutable",
                },
              ],
            },
          ]
        : [
            // Evita chunks Turbopack stale en el navegador durante desarrollo
            {
              source: "/_next/(.*)",
              headers: [
                {
                  key: "Cache-Control",
                  value: "no-store, no-cache, must-revalidate, max-age=0",
                },
              ],
            },
          ]),
    ];
  },

  // Redirigir HTTP → HTTPS en producción (Vercel ya lo hace, pero doble protección)
  async redirects() {
    if (!isProduction) return [];
    return [
      {
        source: "/:path*",
        has: [{ type: "header", key: "x-forwarded-proto", value: "http" }],
        destination: "https://anttova.com/:path*",
        permanent: true,
      },
    ];
  },

  compress: true,

  logging: {
    fetches: { fullUrl: false },
  },
};

export default nextConfig;
