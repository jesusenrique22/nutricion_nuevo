-- Estado de salud de la conexión con Google Calendar.
-- Sin esto el panel decía "conectado" aunque Google hubiera revocado el token,
-- y los eventos dejaban de sincronizarse en silencio.
ALTER TABLE "GoogleCalendarConnection"
  ADD COLUMN IF NOT EXISTS "invalidatedAt" TIMESTAMP(3);
ALTER TABLE "GoogleCalendarConnection"
  ADD COLUMN IF NOT EXISTS "lastError" TEXT;
