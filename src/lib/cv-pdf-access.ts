/** Solo permite servir el CV cuando la petición viene del sitio (no URL directa). */
export function isAllowedCvPdfRequest(req: Request): boolean {
  const secFetchSite = req.headers.get("sec-fetch-site");
  if (secFetchSite === "cross-site") return false;

  const host = req.headers.get("host");
  const referer = req.headers.get("referer");
  const origin = req.headers.get("origin");

  if (referer && host) {
    try {
      return new URL(referer).host === host;
    } catch {
      return false;
    }
  }

  if (origin && host) {
    try {
      return new URL(origin).host === host;
    } catch {
      return false;
    }
  }

  if (secFetchSite === "same-origin" || secFetchSite === "same-site") {
    return true;
  }

  const dest = req.headers.get("sec-fetch-dest");
  const mode = req.headers.get("sec-fetch-mode");

  // iframe embebido (bundle viejo) puede llegar sin Referer
  if (secFetchSite === "none" && dest === "iframe") {
    return true;
  }

  // Bloquear abrir la URL del API directamente en el navegador
  if (mode === "navigate" || dest === "document") {
    return false;
  }

  return false;
}
