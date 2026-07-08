#!/usr/bin/env node
/** Libera los puertos 3000 (Next) y 3001 (socket) antes de `pnpm run dev`. */
import { execSync } from "node:child_process";

const PORTS = [3000, 3001];
const killed = new Set();

for (const port of PORTS) {
  try {
    const pids = execSync(`lsof -nP -iTCP:${port} -sTCP:LISTEN -t`, {
      encoding: "utf8",
    })
      .trim()
      .split("\n")
      .filter(Boolean);
    for (const pid of pids) {
      if (killed.has(pid)) continue;
      try {
        process.kill(Number(pid), "SIGKILL");
        killed.add(pid);
        console.log(`✓ Puerto ${port}: proceso ${pid} terminado`);
      } catch {
        // ya no existe
      }
    }
  } catch {
    console.log(`· Puerto ${port}: libre`);
  }
}

if (killed.size === 0) {
  console.log("Nada que liberar en 3000/3001.");
} else {
  console.log("\nListo. Ahora: pnpm run dev");
}
