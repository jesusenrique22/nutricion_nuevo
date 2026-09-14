import Image from "next/image";
import { shouldUnoptimizeImage } from "@/lib/media-url";

/** Foto de paquete en lobby: 16:10, imagen completa sin recortes agresivos. */
export function PackageHeroImage({
  src,
  alt,
  sizes = "(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 380px",
}: {
  src: string;
  alt: string;
  sizes?: string;
}) {
  return (
    <div className="relative aspect-[16/10] w-full shrink-0 overflow-hidden bg-gradient-to-b from-muted/30 to-muted/10">
      <Image
        src={src}
        alt={alt}
        fill
        className="object-contain p-2 sm:p-3"
        sizes={sizes}
        loading="lazy"
        unoptimized={shouldUnoptimizeImage(src)}
      />
    </div>
  );
}
