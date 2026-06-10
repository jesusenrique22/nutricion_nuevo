import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* Server Actions cross-origin: configure via proxy if needed for dev tunnels */
  serverExternalPackages: ["@prisma/client", "prisma"],
};

export default nextConfig;
