export async function parseJsonResponse<T extends Record<string, unknown>>(
  res: Response,
): Promise<T & { error?: string }> {
  const text = await res.text();
  if (!text.trim()) {
    return {
      error: res.ok
        ? "El servidor no devolvió datos."
        : `Error ${res.status} del servidor.`,
    } as T & { error?: string };
  }
  try {
    return JSON.parse(text) as T & { error?: string };
  } catch {
    return {
      error: res.ok
        ? "Respuesta inválida del servidor."
        : `Error ${res.status} del servidor.`,
    } as T & { error?: string };
  }
}
