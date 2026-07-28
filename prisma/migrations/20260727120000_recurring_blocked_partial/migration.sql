-- Franja opcional en bloqueos recurrentes (null/null = día completo).
ALTER TABLE "RecurringBlockedWeekday" ADD COLUMN IF NOT EXISTS "startTime" TEXT;
ALTER TABLE "RecurringBlockedWeekday" ADD COLUMN IF NOT EXISTS "endTime" TEXT;
