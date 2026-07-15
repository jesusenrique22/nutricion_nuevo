"use client";

import { ImageMedia } from "@/components/media/image-media";
import type { ProductImage } from "@/types/products";

/** Galería de producto — compuesto con ImageMedia.ProductListRoot. */
export function ProductImagesUploadField({
  label,
  images,
  onChange,
  folder = "products",
  productName,
}: {
  label: string;
  images: ProductImage[];
  onChange: (images: ProductImage[]) => void;
  folder?: string;
  productName?: string;
}) {
  return (
    <ImageMedia.ProductListRoot
      label={label}
      images={images}
      onChange={onChange}
      folder={folder}
      productName={productName}
    />
  );
}
