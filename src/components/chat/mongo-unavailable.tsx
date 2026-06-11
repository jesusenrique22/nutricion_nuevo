export function MongoUnavailable({
  feature = "esta sección",
}: {
  feature?: string;
}) {
  return (
    <div className="mt-6 rounded-2xl border border-amber-200 bg-amber-50 px-5 py-4 text-sm text-amber-950">
      <p className="font-semibold">Chat temporalmente no disponible</p>
      <p className="mt-2 leading-relaxed text-amber-900/85">
        No pudimos conectar con la base de datos de {feature}. El resto del
        panel (citas, formularios, estadísticas) sigue funcionando con
        PostgreSQL.
      </p>
      <p className="mt-3 text-xs text-amber-900/70">
        Si sos administrador: en Vercel revisá <code>MONGODB_URI</code> y{" "}
        <code>MONGODB_DB</code>, y en Atlas → Network Access agregá{" "}
        <code>0.0.0.0/0</code>.
      </p>
    </div>
  );
}
