-- Varias franjas por día de la semana.
-- Con weekday único, bloquear 17:00–18:00 un lunes pisaba el bloqueo de
-- 08:00–13:00 del mismo lunes: solo se podía tener una franja por día.
ALTER TABLE "RecurringBlockedWeekday"
  DROP CONSTRAINT IF EXISTS "RecurringBlockedWeekday_weekday_key";

DROP INDEX IF EXISTS "RecurringBlockedWeekday_weekday_key";

CREATE INDEX IF NOT EXISTS "RecurringBlockedWeekday_weekday_idx"
  ON "RecurringBlockedWeekday"("weekday");
