import type { ProductImage, ProductItem } from "@/types/products";

/** Normaliza imágenes: usa `images[]` o migra desde `imageSrc` legado. */
export function getProductImages(
  item: ProductItem & { imageSrc?: string; imageAlt?: string },
): ProductImage[] {
  if (item.images?.length) {
    return item.images.filter((img) => img.src?.trim());
  }
  const legacy = item.imageSrc?.trim();
  if (legacy) {
    return [{ src: legacy, alt: item.imageAlt?.trim() || item.name }];
  }
  return [];
}

export function getProductPrimaryImage(
  item: ProductItem & { imageSrc?: string; imageAlt?: string },
): ProductImage | null {
  return getProductImages(item)[0] ?? null;
}
