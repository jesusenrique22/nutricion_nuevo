export const PRODUCTS_SLUG = "products_catalog";

export interface ProductCategory {
  id: string;
  label: string;
}

export interface ProductImage {
  src: string;
  alt: string;
}

export interface ProductItem {
  id: string;
  name: string;
  /** Texto corto para la tarjeta del catálogo. */
  description: string;
  /** Descripción completa en la vista de detalle (opcional). */
  detailDescription: string;
  price: number;
  currency: "ARS" | "USD";
  images: ProductImage[];
  categoryId: string;
  enabled: boolean;
}

export interface ProductsData {
  heading: string;
  subheading: string;
  categories: ProductCategory[];
  items: ProductItem[];
}

export type ProductPurchaseStatus = "PENDING" | "GRANTED";
