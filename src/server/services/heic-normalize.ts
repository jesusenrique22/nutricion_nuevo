import convert from "heic-convert";

/** Detecta HEIC/HEIF por magic bytes (ftyp….heic/heif/mif1). */
export function isHeicBuffer(buffer: Buffer): boolean {
  if (buffer.length < 12) return false;
  // bytes 4-7 = "ftyp"
  if (buffer.toString("ascii", 4, 8) !== "ftyp") return false;
  const brand = buffer.toString("ascii", 8, 12).toLowerCase();
  return (
    brand === "heic" ||
    brand === "heif" ||
    brand === "mif1" ||
    brand === "msf1" ||
    brand === "hevx"
  );
}

export async function convertHeicBufferToJpeg(
  buffer: Buffer,
  quality = 0.88,
): Promise<Buffer> {
  const output = await convert({
    buffer,
    format: "JPEG",
    quality,
  });
  return Buffer.from(output);
}
