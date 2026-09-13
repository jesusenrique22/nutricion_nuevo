#!/usr/bin/env node
/**
 * Pruebas locales de política de upload y almacenamiento de recursos.
 * Uso: pnpm run test:resources
 */
import { readFileSync, unlinkSync, mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { pathToFileURL } from "node:url";

const ROOT = process.cwd();

async function importTs(relativePath) {
  return import(pathToFileURL(join(ROOT, relativePath)).href);
}

function miniPdfBuffer() {
  const pdf = `%PDF-1.4
1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj
2 0 obj<</Type/Pages/Kids[3 0 R]/Count 1>>endobj
3 0 obj<</Type/Page/MediaBox[0 0 200 200]/Parent 2 0 R>>endobj
xref
0 4
0000000000 65535 f 
0000000009 00000 n 
0000000052 00000 n 
0000000101 00000 n 
trailer<</Size 4/Root 1 0 R>>
startxref
178
%%EOF`;
  return Buffer.from(pdf, "utf8");
}

async function main() {
  console.log("Pruebas de recursos (upload)…\n");
  const policy = await importTs("src/lib/upload-policy.ts");
  const chunked = await importTs("src/lib/chunked-client-upload.ts");
  let passed = 0;
  let failed = 0;

  function ok(label) {
    console.log(`  ✓ ${label}`);
    passed += 1;
  }
  function fail(label, detail) {
    console.error(`  ✗ ${label}${detail ? `: ${detail}` : ""}`);
    failed += 1;
  }

  const small = policy.validateUploadMetadata("guia.pdf", "application/pdf", 1024, "pdf");
  if (small.ok) ok("PDF pequeño válido (metadatos)");
  else fail("PDF pequeño válido", small.message);

  const large = policy.validateUploadMetadata(
    "guia.pdf",
    "application/pdf",
    60 * 1024 * 1024,
    "pdf",
  );
  if (!large.ok && large.message.includes("demasiado grande")) {
    ok("Rechaza PDF > 50 MB");
  } else fail("Rechaza PDF > 50 MB");

  if (chunked.needsChunkedUpload(5 * 1024 * 1024)) {
    ok("Archivo 5 MB usa subida por fragmentos");
  } else {
    fail("Umbral de fragmentos");
  }

  if (policy.CHUNKED_UPLOAD_PART_BYTES === 3 * 1024 * 1024) {
    ok("Tamaño de fragmento = 3 MB");
  } else {
    fail("Tamaño de fragmento");
  }

  const buffer = miniPdfBuffer();
  const bufferValidation = policy.validateUploadBuffer(
    buffer,
    "test-guia.pdf",
    "application/pdf",
    "pdf",
  );
  if (bufferValidation.ok) ok("Buffer PDF ensamblado válido");
  else fail("Buffer PDF ensamblado", bufferValidation.message);

  try {
    const prevNodeEnv = process.env.NODE_ENV;
    const prevVercel = process.env.VERCEL;
    process.env.NODE_ENV = "development";
    delete process.env.VERCEL;

    const storage = await importTs("src/server/services/file-storage.ts");
    const stored = await storage.storePublicBuffer(buffer, "resources", {
      fileName: "test-guia.pdf",
      mimeType: "application/pdf",
    });

    process.env.NODE_ENV = prevNodeEnv;
    if (prevVercel) process.env.VERCEL = prevVercel;

    if (stored.url) {
      ok(`storePublicBuffer → ${stored.url} (${stored.provider})`);
      if (stored.provider === "local") {
        const rel = stored.url.replace(/^\//, "");
        const abs = join(ROOT, "public", rel);
        const saved = readFileSync(abs);
        if (saved.length === buffer.length) ok("Archivo local con tamaño correcto");
        else fail("Tamaño guardado", `${saved.length} vs ${buffer.length}`);
        unlinkSync(abs);
      }
    } else {
      fail("storePublicBuffer", "sin URL");
    }
  } catch (err) {
    fail("storePublicBuffer", err instanceof Error ? err.message : String(err));
  }

  console.log(`\nResultado: ${passed} ok, ${failed} fallos`);
  process.exit(failed > 0 ? 1 : 0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
