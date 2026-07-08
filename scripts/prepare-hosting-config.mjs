#!/usr/bin/env node
/**
 * En el servidor de build del hosting, copia deploy.json → vercel.json
 * para headers/crons. No se commitea vercel.json (ver .gitignore).
 */
import { copyFileSync, existsSync } from "node:fs";

if (process.env.VERCEL !== "1") {
  process.exit(0);
}

if (!existsSync("deploy.json")) {
  console.warn("[hosting] deploy.json no encontrado — omitiendo config del CDN");
  process.exit(0);
}

copyFileSync("deploy.json", "vercel.json");
console.log("[hosting] deploy.json aplicado como vercel.json en este build");
