import type { NextConfig } from "next";

const isProduction = process.env.NODE_ENV === "production";

const contentSecurityPolicy = [
  "default-src 'self'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'self'",
  "object-src 'none'",
  "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://www.google.com https://www.gstatic.com",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https://res.cloudinary.com",
  "font-src 'self' data:",
  "connect-src 'self' https://*.upstash.io wss: https://www.google.com",
  "frame-src 'self' https://www.google.com",
].join("; ");

const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "SAMEORIGIN" },
  { key: "X-XSS-Protection", value: "1; mode=block" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=()",
  },
  { key: "Content-Security-Policy", value: contentSecurityPolicy },
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
  env: {
    NEXT_PUBLIC_RECAPTCHA_ENTERPRISE: useRecaptchaEnterprise ? "true" : "false",
  },

  serverExternalPackages: ["@prisma/client", "prisma", "pdfjs-dist", "@napi-rs/canvas"],

  images: {
    remotePatterns: [
      { protocol: "https", hostname: "res.cloudinary.com" },
    ],
  },

  async headers() {
    return [
      {
        source: "/(.*)",
        headers: securityHeaders,
      },
    ];
  },

  compress: true,

  logging: {
    fetches: { fullUrl: false },
  },
};

export default nextConfig;
