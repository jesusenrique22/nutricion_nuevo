import Image from "next/image";
import { isCloudinaryUrl, isMongoMediaUrl } from "@/lib/media-url";
import {
  isDisplayableCoverUrl,
  isLocalCoverPath,
} from "@/lib/resource-cover";

export function ResourceCoverImage({
  src,
  alt,
  className = "object-cover",
  sizes = "(max-width:768px) 100vw, 33vw",
}: {
  src: string;
  alt: string;
  className?: string;
  sizes?: string;
}) {
  if (!isDisplayableCoverUrl(src)) return null;

  if (isLocalCoverPath(src) || isCloudinaryUrl(src)) {
    return (
      <Image
        src={src}
        alt={alt}
        fill
        className={className}
        sizes={sizes}
        unoptimized={
          isMongoMediaUrl(src) || src.startsWith("/uploads/")
        }
      />
    );
  }

  return (
    // Other remote URLs use <img> to avoid next.config host allowlists.
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt={alt}
      className={`absolute inset-0 h-full w-full ${className}`}
    />
  );
}
