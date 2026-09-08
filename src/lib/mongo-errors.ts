export function isMongoConnectionError(error: unknown): boolean {
  if (!(error instanceof Error)) return false;
  const msg = error.message;
  return (
    error.name === "MongoServerSelectionError" ||
    error.name === "MongoNetworkError" ||
    msg.includes("SSL routines") ||
    msg.includes("No pudimos conectar con el almacenamiento") ||
    msg.includes("Falta la variable de entorno MONGODB_URI") ||
    msg.includes("Server selection timed out")
  );
}
