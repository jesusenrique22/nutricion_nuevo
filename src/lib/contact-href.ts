import type { ContactameLinkKind } from "@/types/contactame";

function stripAt(value: string): string {
  return value.replace(/^@+/, "").trim();
}

function extractInstagramHandle(raw: string): string | null {
  const value = raw.trim();
  if (!value) return null;

  try {
    const withProto = /^https?:\/\//i.test(value) ? value : `https://${value}`;
    const url = new URL(withProto);
    const host = url.hostname.replace(/^www\./i, "").toLowerCase();
    if (
      host === "instagram.com" ||
      host === "instagr.am" ||
      host.endsWith(".instagram.com")
    ) {
      const segment = url.pathname
        .split("/")
        .map((s) => decodeURIComponent(s.trim()))
        .filter(Boolean)[0];
      if (
        !segment ||
        ["p", "reel", "reels", "stories", "explore"].includes(
          segment.toLowerCase(),
        )
      ) {
        return null;
      }
      const handle = stripAt(segment);
      return /^[A-Za-z0-9._]{1,30}$/.test(handle) ? handle : null;
    }
  } catch {
    // bare handle below
  }

  const cleaned = stripAt(
    value
      .replace(/^https?:\/\//i, "")
      .replace(/^(www\.)?instagram\.com\/?/i, "")
      .split(/[/?#]/)[0]!
      .trim(),
  );
  if (/^[A-Za-z0-9._]{1,30}$/.test(cleaned)) return cleaned;
  return null;
}

function extractTikTokHandle(raw: string): string | null {
  const value = raw.trim();
  if (!value) return null;
  try {
    const withProto = /^https?:\/\//i.test(value) ? value : `https://${value}`;
    const url = new URL(withProto);
    const host = url.hostname.replace(/^www\./i, "").toLowerCase();
    if (host === "tiktok.com" || host.endsWith(".tiktok.com")) {
      const segment = url.pathname
        .split("/")
        .map((s) => decodeURIComponent(s.trim()))
        .filter(Boolean)[0];
      if (!segment) return null;
      const handle = stripAt(segment);
      return /^[A-Za-z0-9._]{1,24}$/.test(handle) ? handle : null;
    }
  } catch {
    // bare
  }
  const bare = stripAt(value.replace(/^https?:\/\//i, "").split(/[/?#]/)[0]!);
  if (/^[A-Za-z0-9._]{1,24}$/.test(bare)) return bare;
  return null;
}

/**
 * Normaliza href de Contáctame para que no queden URLs vacías
 * (p. ej. https://instagram.com/ sin usuario → página caída).
 */
export function normalizeContactHref(
  kind: ContactameLinkKind,
  raw: string,
): string {
  const value = raw.trim();
  if (!value) return value;

  if (kind === "instagram") {
    const handle = extractInstagramHandle(value);
    if (handle) return `https://www.instagram.com/${handle}/`;
    return value;
  }

  if (kind === "tiktok") {
    const handle = extractTikTokHandle(value);
    if (handle) return `https://www.tiktok.com/@${handle}`;
    return value;
  }

  if (kind === "whatsapp") {
    if (/^https?:\/\//i.test(value) || /^wa\.me\//i.test(value)) {
      return value.startsWith("http") ? value : `https://${value}`;
    }
    const digits = value.replace(/\D/g, "");
    if (digits.length >= 8) return `https://wa.me/${digits}`;
    return value;
  }

  if (kind === "email" && !value.toLowerCase().startsWith("mailto:")) {
    return `mailto:${value}`;
  }

  if (kind === "phone" && !value.toLowerCase().startsWith("tel:")) {
    return `tel:${value.replace(/\s+/g, "")}`;
  }

  if (
    (kind === "youtube" ||
      kind === "linkedin" ||
      kind === "location" ||
      kind === "custom") &&
    !/^(https?:|mailto:|tel:)/i.test(value) &&
    value.includes(".")
  ) {
    return `https://${value}`;
  }

  return value;
}

/** true si el enlace quedó incompleto (p. ej. Instagram sin usuario). */
export function isIncompleteContactHref(
  kind: ContactameLinkKind,
  href: string,
): boolean {
  const value = href.trim();
  if (!value) return true;

  if (kind === "instagram") {
    return !extractInstagramHandle(value);
  }
  if (kind === "tiktok") {
    return !extractTikTokHandle(value);
  }
  if (kind === "whatsapp") {
    if (/wa\.me\/\d{8,}/i.test(value)) return false;
    return value.replace(/\D/g, "").length < 8;
  }
  if (kind === "email") {
    const addr = value.replace(/^mailto:/i, "").trim();
    return !addr.includes("@");
  }
  return false;
}
