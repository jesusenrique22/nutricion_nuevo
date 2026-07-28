import {
  CONTACTAME_SLUG,
  DEFAULT_CONTACTAME,
  type ContactameData,
  type ContactameLink,
  type ContactameLinkKind,
} from "@/types/contactame";
import { normalizeContactHref } from "@/lib/contact-href";

const KINDS = new Set<ContactameLinkKind>([
  "tiktok",
  "instagram",
  "linkedin",
  "youtube",
  "whatsapp",
  "email",
  "phone",
  "location",
  "custom",
]);

function str(value: unknown, fallback = ""): string {
  return typeof value === "string" ? value.trim() : fallback;
}

function parseLink(raw: unknown, index: number): ContactameLink | null {
  if (!raw || typeof raw !== "object") return null;
  const row = raw as Record<string, unknown>;
  const label = str(row.label);
  const hrefRaw = str(row.href);
  if (!label || !hrefRaw) return null;
  const kindRaw = str(row.kind, "custom") as ContactameLinkKind;
  const kind = KINDS.has(kindRaw) ? kindRaw : "custom";
  return {
    id: str(row.id) || `link-${index}`,
    label,
    href: normalizeContactHref(kind, hrefRaw),
    enabled: row.enabled !== false,
    kind,
    external: row.external !== false && kind !== "email" && kind !== "phone",
  };
}

export function mergeContactame(
  stored: Record<string, unknown> | null | undefined,
): ContactameData {
  if (!stored) return structuredClone(DEFAULT_CONTACTAME);

  const linksRaw = Array.isArray(stored.links) ? stored.links : null;
  const links = linksRaw
    ? linksRaw
        .map((item, i) => parseLink(item, i))
        .filter((l): l is ContactameLink => Boolean(l))
    : DEFAULT_CONTACTAME.links;

  return {
    sectionTitle: str(stored.sectionTitle, DEFAULT_CONTACTAME.sectionTitle),
    footerLine: str(stored.footerLine, DEFAULT_CONTACTAME.footerLine),
    links: links.length ? links : structuredClone(DEFAULT_CONTACTAME.links),
  };
}

export function contactameToRecord(
  data: ContactameData,
): Record<string, unknown> {
  return {
    sectionTitle: data.sectionTitle,
    footerLine: data.footerLine,
    links: data.links.map((l) => ({
      id: l.id,
      label: l.label,
      href: normalizeContactHref(l.kind, l.href),
      enabled: l.enabled,
      kind: l.kind,
      external: l.external,
    })),
  };
}

export function visibleContactameLinks(data: ContactameData): ContactameLink[] {
  return data.links
    .filter((l) => l.enabled && l.href.trim())
    .map((l) => ({
      ...l,
      href: normalizeContactHref(l.kind, l.href),
    }));
}

export { CONTACTAME_SLUG };
