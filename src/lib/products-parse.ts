import type {
  ProductCategory,
  ProductImage,
  ProductItem,
  ProductsData,
} from "@/types/products";

export const DEFAULT_PRODUCTS: ProductsData = {
  heading: "Productos",
  subheading: "Suplementos, materiales y productos recomendados por Anttova.",
  categories: [
    { id: "suplementos", label: "Suplementos" },
    { id: "materiales", label: "Materiales" },
  ],
  items: [
    {
      id: "prod-ejemplo-1",
      name: "Producto de ejemplo",
      description:
        "Editá o eliminá este producto de muestra desde Personalizar → Otros → Productos.",
      detailDescription: "",
      price: 0,
      currency: "ARS",
      images: [],
      categoryId: "suplementos",
      enabled: true,
    },
  ],
};

function isNonEmptyString(v: unknown): v is string {
  return typeof v === "string" && v.trim().length > 0;
}

function asString(v: unknown): string {
  return typeof v === "string" ? v : "";
}

let idCounter = 0;
function generateId(prefix: string): string {
  idCounter += 1;
  return `${prefix}-${Date.now().toString(36)}-${idCounter}`;
}

/** Migra precios guardados como texto ("$35.000") a número. */
function parsePrice(value: unknown): number {
  if (typeof value === "number" && Number.isFinite(value)) {
    return Math.max(0, value);
  }
  if (typeof value === "string") {
    const digits = value.replace(/[^\d.,]/g, "").replace(",", ".");
    const n = Number.parseFloat(digits);
    return Number.isFinite(n) ? Math.max(0, n) : 0;
  }
  return 0;
}

function parseCurrency(value: unknown): "ARS" | "USD" {
  return value === "USD" ? "USD" : "ARS";
}

function parseCategories(value: unknown): ProductCategory[] {
  if (!Array.isArray(value)) return [];
  const categories: ProductCategory[] = [];
  for (const raw of value) {
    if (!raw || typeof raw !== "object") continue;
    const row = raw as Record<string, unknown>;
    if (!isNonEmptyString(row.label)) continue;
    categories.push({
      id: isNonEmptyString(row.id) ? row.id : generateId("cat"),
      label: row.label.trim(),
    });
  }
  return categories;
}

function parseImages(row: Record<string, unknown>, name: string): ProductImage[] {
  if (Array.isArray(row.images)) {
    const images: ProductImage[] = [];
    for (const raw of row.images) {
      if (!raw || typeof raw !== "object") continue;
      const img = raw as Record<string, unknown>;
      const src = asString(img.src).trim();
      if (!src) continue;
      images.push({
        src,
        alt: asString(img.alt).trim() || name,
      });
    }
    if (images.length > 0) return images;
  }
  const legacySrc = asString(row.imageSrc).trim();
  if (legacySrc) {
    return [{ src: legacySrc, alt: asString(row.imageAlt).trim() || name }];
  }
  return [];
}

function parseItems(value: unknown): ProductItem[] {
  if (!Array.isArray(value)) return [];
  const items: ProductItem[] = [];
  for (const raw of value) {
    if (!raw || typeof raw !== "object") continue;
    const row = raw as Record<string, unknown>;
    if (!isNonEmptyString(row.name)) continue;
    const name = row.name.trim();
    items.push({
      id: isNonEmptyString(row.id) ? row.id : generateId("prod"),
      name,
      description: asString(row.description),
      detailDescription: asString(row.detailDescription),
      price: parsePrice(row.price),
      currency: parseCurrency(row.currency),
      images: parseImages(row, name),
      categoryId: asString(row.categoryId),
      enabled: row.enabled !== false,
    });
  }
  return items;
}

export function mergeProducts(
  stored: Record<string, unknown> | null | undefined,
): ProductsData {
  if (!stored) return DEFAULT_PRODUCTS;

  const items = parseItems(stored.items);
  const categories = parseCategories(stored.categories);

  if (items.length === 0 && categories.length === 0 && !stored.heading) {
    return DEFAULT_PRODUCTS;
  }

  return {
    heading: isNonEmptyString(stored.heading)
      ? (stored.heading as string)
      : DEFAULT_PRODUCTS.heading,
    subheading: asString(stored.subheading),
    categories,
    items,
  };
}

export function productsToRecord(data: ProductsData): Record<string, unknown> {
  return {
    heading: data.heading,
    subheading: data.subheading,
    categories: data.categories,
    items: data.items,
  };
}

export function findProductById(
  data: ProductsData,
  productId: string,
): ProductItem | null {
  return data.items.find((it) => it.id === productId && it.enabled) ?? null;
}
