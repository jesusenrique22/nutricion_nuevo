"use client";

const VERCEL_SAFE_IMAGE_BYTES = 3.5 * 1024 * 1024;
const MAX_IMAGE_DIMENSION = 2560;

function outputName(name: string): string {
  const stem = name.replace(/\.[^.]+$/, "") || "imagen";
  return `${stem}.jpg`;
}

async function decodeImage(file: File): Promise<{
  width: number;
  height: number;
  draw: (
    context: CanvasRenderingContext2D,
    width: number,
    height: number,
  ) => void;
  close?: () => void;
}> {
  if ("createImageBitmap" in window) {
    const bitmap = await createImageBitmap(file);
    return {
      width: bitmap.width,
      height: bitmap.height,
      draw: (context, width, height) =>
        context.drawImage(bitmap, 0, 0, width, height),
      close: () => bitmap.close(),
    };
  }

  const image = new Image();
  const objectUrl = URL.createObjectURL(file);
  try {
    await new Promise<void>((resolve, reject) => {
      image.onload = () => resolve();
      image.onerror = () => reject(new Error("No se pudo leer la imagen."));
      image.src = objectUrl;
    });
  } finally {
    URL.revokeObjectURL(objectUrl);
  }

  return {
    width: image.naturalWidth,
    height: image.naturalHeight,
    draw: (context, width, height) => context.drawImage(image, 0, 0, width, height),
  };
}

async function canvasToJpeg(
  source: Awaited<ReturnType<typeof decodeImage>>,
  maxDimension: number,
  quality: number,
): Promise<Blob> {
  const ratio = Math.min(1, maxDimension / Math.max(source.width, source.height));
  const width = Math.max(1, Math.round(source.width * ratio));
  const height = Math.max(1, Math.round(source.height * ratio));
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Tu navegador no permite preparar la imagen.");

  // JPEG no admite transparencia: conservar un fondo blanco en PNG transparentes.
  context.fillStyle = "#ffffff";
  context.fillRect(0, 0, width, height);
  source.draw(context, width, height);

  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob(resolve, "image/jpeg", quality),
  );
  if (!blob) throw new Error("No se pudo comprimir la imagen.");
  return blob;
}

/**
 * Vercel rechaza cuerpos grandes antes de ejecutar la API. Normaliza fotos a
 * JPEG, limita su lado mayor y baja su peso a un tamaño seguro para la función.
 */
export async function prepareImageForUpload(file: File): Promise<File> {
  const isImage = file.type.startsWith("image/");
  const isAnimatedGif = file.type === "image/gif";

  if (!isImage || isAnimatedGif) return file;
  if (/image\/hei[cf]/i.test(file.type) || /\.hei[cf]$/i.test(file.name)) {
    throw new Error(
      "HEIC no se puede preparar en el navegador. Convertí la foto a JPG o PNG antes de subirla.",
    );
  }

  let source: Awaited<ReturnType<typeof decodeImage>>;
  try {
    source = await decodeImage(file);
  } catch {
    throw new Error(
      "No se pudo leer la imagen. Usá una foto JPG, PNG o WebP.",
    );
  }

  try {
    const needsResize =
      Math.max(source.width, source.height) > MAX_IMAGE_DIMENSION;
    if (!needsResize && file.size <= VERCEL_SAFE_IMAGE_BYTES) return file;

    let maxDimension = MAX_IMAGE_DIMENSION;
    let quality = 0.86;
    let blob = await canvasToJpeg(source, maxDimension, quality);

    while (blob.size > VERCEL_SAFE_IMAGE_BYTES && maxDimension > 960) {
      maxDimension = Math.round(maxDimension * 0.8);
      quality = Math.max(0.62, quality - 0.08);
      blob = await canvasToJpeg(source, maxDimension, quality);
    }

    if (blob.size > VERCEL_SAFE_IMAGE_BYTES) {
      throw new Error(
        "La imagen sigue siendo muy pesada. Elegí una foto más liviana o reducí sus dimensiones.",
      );
    }

    return new File([blob], outputName(file.name), {
      type: "image/jpeg",
      lastModified: file.lastModified,
    });
  } finally {
    source.close?.();
  }
}
