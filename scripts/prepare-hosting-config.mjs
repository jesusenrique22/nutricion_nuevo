#!/usr/bin/env node
/**
 * En Vercel, genera vercel.json (crons + un solo bundle de funciones).
 * Hobby admite 12 funciones: configs distintas por ruta las multiplican.
 */
import { existsSync, readFileSync, writeFileSync } from "node:fs";

if (process.env.VERCEL !== "1") {
  process.exit(0);
}

if (!existsSync("deploy.json")) {
  console.warn("[hosting] deploy.json no encontrado — omitiendo config del CDN");
  process.exit(0);
}

const deploy = JSON.parse(readFileSync("deploy.json", "utf8"));
const vercelConfig = {
  framework: "nextjs",
};

if (Array.isArray(deploy.crons) && deploy.crons.length > 0) {
  vercelConfig.crons = deploy.crons;
}

writeFileSync("vercel.json", `${JSON.stringify(vercelConfig, null, 2)}\n`);
console.log("[hosting] vercel.json generado (crons + framework)");
