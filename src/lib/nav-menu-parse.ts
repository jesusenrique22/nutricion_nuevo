import type {
  NavItemType,
  NavMenuData,
  NavMenuItem,
} from "@/types/nav-menu";

export const DEFAULT_NAV_MENU: NavMenuData = {
  items: [
    { id: "nav-inicio", label: "Inicio", type: "section", target: "inicio", enabled: true },
    { id: "nav-sobre-mi", label: "Sobre mí", type: "page", target: "/nutricionista", enabled: true },
    { id: "nav-paquetes", label: "Paquetes", type: "section", target: "paquetes", enabled: true },
    { id: "nav-recursos", label: "Recursos", type: "page", target: "/resources", enabled: true },
    { id: "nav-contacto", label: "Contáctame", type: "section", target: "contacto", enabled: true },
  ],
};

function isNonEmptyString(v: unknown): v is string {
  return typeof v === "string" && v.trim().length > 0;
}

let idCounter = 0;
function generateId(): string {
  idCounter += 1;
  return `nav-${Date.now().toString(36)}-${idCounter}`;
}

function parseType(value: unknown): NavItemType {
  return value === "page" || value === "external" ? value : "section";
}

function parseItem(value: unknown): NavMenuItem | null {
  if (!value || typeof value !== "object") return null;
  const row = value as Record<string, unknown>;
  if (!isNonEmptyString(row.label) || !isNonEmptyString(row.target)) return null;
  return {
    id: isNonEmptyString(row.id) ? row.id : generateId(),
    label: row.label.trim(),
    type: parseType(row.type),
    target: row.target.trim(),
    enabled: row.enabled !== false,
  };
}

function parseItems(value: unknown): NavMenuItem[] | null {
  if (!Array.isArray(value)) return null;
  const items: NavMenuItem[] = [];
  for (const raw of value) {
    const item = parseItem(raw);
    if (item) items.push(item);
  }
  return items.length > 0 ? items : null;
}

export function mergeNavMenu(
  stored: Record<string, unknown> | null | undefined,
): NavMenuData {
  const parsed = stored ? parseItems(stored.items) : null;
  return parsed ? { items: parsed } : DEFAULT_NAV_MENU;
}

export function navMenuToRecord(data: NavMenuData): Record<string, unknown> {
  return { items: data.items };
}
