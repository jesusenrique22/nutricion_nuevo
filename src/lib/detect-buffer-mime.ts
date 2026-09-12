/** Detecta MIME por magic bytes (sin dependencias de servidor). */
export function detectBufferMimeType(
  buffer: Buffer,
  fallbackMime?: string,
): string {
  if (
    buffer.length >= 5 &&
    buffer.subarray(0, 5).toString("ascii") === "%PDF-"
  ) {
    return "application/pdf";
  }
  if (
    buffer.length >= 3 &&
    buffer[0] === 0xff &&
    buffer[1] === 0xd8 &&
    buffer[2] === 0xff
  ) {
    return "image/jpeg";
  }
  if (
    buffer.length >= 8 &&
    buffer[0] === 0x89 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x4e &&
    buffer[3] === 0x47
  ) {
    return "image/png";
  }
  if (
    buffer.length >= 12 &&
    buffer.subarray(0, 4).toString("ascii") === "RIFF" &&
    buffer.subarray(8, 12).toString("ascii") === "WEBP"
  ) {
    return "image/webp";
  }
  if (
    buffer.length >= 6 &&
    buffer.subarray(0, 6).toString("ascii").startsWith("GIF8")
  ) {
    return "image/gif";
  }
  if (fallbackMime && fallbackMime !== "application/octet-stream") {
    return fallbackMime;
  }
  return "application/octet-stream";
}
