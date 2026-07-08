#!/usr/bin/env node
/**
 * Falla el build en Vercel si el entorno de producción está mal configurado.
 */
import {
  formatEnvCheckReport,
  isProductionDeployContext,
  validateProductionEnvironment,
} from "../src/lib/env/production-safety";

function main() {
  if (!isProductionDeployContext()) {
    console.log(
      "[check:env] Entorno local/dev — omitiendo validación estricta (CHECK_PRODUCTION_ENV=1 para forzar).",
    );
    return;
  }

  const issues = validateProductionEnvironment();
  const errors = issues.filter((i) => i.level === "error");
  const warnings = issues.filter((i) => i.level === "warning");

  if (warnings.length > 0) {
    console.warn(formatEnvCheckReport(warnings));
  }

  if (errors.length > 0) {
    console.error(formatEnvCheckReport(errors));
    console.error(
      "\n✗ Deploy bloqueado: corregí las variables en Vercel y volvé a desplegar.\n",
    );
    process.exit(1);
  }

  console.log("✓ Variables de producción validadas");
}

main();
