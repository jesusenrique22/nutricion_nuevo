/** Solo permite servir el CV cuando la petición viene del sitio (no URL directa). */
export function isAllowedCvPdfRequest(req: Request): boolean {
  const secFetchSite = req.headers.get("sec-fetch-site");
  if (secFetchSite === "cross-site") return false;

  const host = req.headers.get("host");
  const referer = req.headers.get("referer");

  if (referer && host) {
    try {
      return new URL(referer).host === host;
    } catch {
      return false;
    }
  }

  return secFetchSite === "same-origin" || secFetchSite === "same-site";
}
