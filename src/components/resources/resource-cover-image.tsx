import Image from "next/image";
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

  if (isLocalCoverPath(src)) {
    return (
      <Image
        src={src}
        alt={alt}
        fill
        className={className}
        sizes={sizes}
      />
    );
  }

  return (
    // Remote image URLs use <img> so admins are not blocked by next.config host allowlists.
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt={alt}
      className={`absolute inset-0 h-full w-full ${className}`}
    />
  );
}
