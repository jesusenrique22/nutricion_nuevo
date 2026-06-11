export async function parseUploadResponse(res: Response): Promise<{
  url?: string;
  error?: string;
}> {
  const text = await res.text();
  if (!text.trim()) {
    return {
      error: res.ok
        ? "El servidor no devolvió datos."
        : `Error ${res.status} al subir el archivo.`,
    };
  }
  try {
    return JSON.parse(text) as { url?: string; error?: string };
  } catch {
    return {
      error: res.ok
        ? "Respuesta inválida del servidor."
        : `Error ${res.status} al subir el archivo.`,
    };
  }
}
