-- Enlace y nota que la doctora asigna al paciente (Drive, material, etc.)
ALTER TABLE "PatientProfile" ADD COLUMN "adminResourceUrl" TEXT;
ALTER TABLE "PatientProfile" ADD COLUMN "adminResourceNote" TEXT;
