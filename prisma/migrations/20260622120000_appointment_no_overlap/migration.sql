-- Impide dos citas PENDING/CONFIRMED en el mismo bloque horario (incluso con requests simultáneos).
-- tsrange + cast a timestamp: tstzrange no es IMMUTABLE y falla en exclusion constraints.
CREATE EXTENSION IF NOT EXISTS btree_gist;

ALTER TABLE "Appointment"
ADD CONSTRAINT "Appointment_no_overlap_active"
EXCLUDE USING gist (
  tsrange("startTime"::timestamp, "endTime"::timestamp, '[)') WITH &&
)
WHERE (status IN ('PENDING', 'CONFIRMED'));
