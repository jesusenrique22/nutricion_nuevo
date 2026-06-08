import { PrismaClient, ConsultationCode } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  // ── Catálogo de consultas (Módulo 1) ──
  await prisma.consultationType.upsert({
    where: { code: ConsultationCode.NUT_01 },
    update: {},
    create: {
      code: ConsultationCode.NUT_01,
      name: "Consulta Nutricional",
      description: "Evaluación y plan nutricional personalizado.",
      durationMinutes: 60,
      price: 50.0,
      allowsOnline: true,
      allowsPresencial: true,
      morningOnly: false,
    },
  });

  await prisma.consultationType.upsert({
    where: { code: ConsultationCode.ENT_02 },
    update: {},
    create: {
      code: ConsultationCode.ENT_02,
      name: "Entrenamiento",
      description: "Asesoría y planificación de entrenamiento.",
      durationMinutes: 60,
      price: 40.0,
      allowsOnline: true,
      allowsPresencial: true,
      morningOnly: false,
    },
  });

  await prisma.consultationType.upsert({
    where: { code: ConsultationCode.ANT_03 },
    update: {},
    create: {
      code: ConsultationCode.ANT_03,
      name: "Antropometría",
      description: "Mediciones corporales. Solo presencial y matutino.",
      durationMinutes: 45,
      price: 35.0,
      allowsOnline: false, // ESTRICTAMENTE presencial
      allowsPresencial: true,
      morningOnly: true, // SOLO horario matutino
      morningStart: "08:00",
      morningEnd: "12:00",
    },
  });

  // ── Cuenta ADMIN (nutricionista) ──
  const adminEmail = "admin@nutricion.local";
  const passwordHash = await bcrypt.hash("Admin1234!", 10);
  await prisma.user.upsert({
    where: { email: adminEmail },
    update: {},
    create: {
      email: adminEmail,
      name: "Dra. Nutricionista",
      role: "ADMIN",
      passwordHash,
    },
  });

  console.log("Seed completado: 3 tipos de consulta + admin creados.");
  console.log(`Admin -> ${adminEmail} / Admin1234!`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
