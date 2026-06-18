import type { NextConfig } from "next";

const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "SAMEORIGIN" },
  { key: "X-XSS-Protection", value: "1; mode=block" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=()",
  },
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

  // Habilita compresión HTTP en el servidor Next.js
  compress: true,

  // Reducir logs de compilación innecesarios
  logging: {
    fetches: { fullUrl: false },
  },
};

export default nextConfig;
