import { PrismaClient, ConsultationCode, Prisma } from "./client";
import bcrypt from "bcryptjs";
import { DEFAULT_FORM_TEMPLATES } from "../src/lib/form-templates-catalog";
import { SITE_CONTENT_DEFAULTS } from "./seed-data";

const prisma: PrismaClient = new PrismaClient();

async function main() {
  await prisma.consultationType.upsert({
    where: { code: ConsultationCode.NUT_01 },
    update: {
      price: new Prisma.Decimal(35000),
      name: "Consulta Nutricional",
    },
    create: {
      code: ConsultationCode.NUT_01,
      name: "Consulta Nutricional",
      description: "Evaluación y plan nutricional personalizado.",
      durationMinutes: 60,
      price: new Prisma.Decimal(35000),
      allowsOnline: true,
      allowsPresencial: true,
      morningOnly: false,
    },
  });

  await prisma.consultationType.upsert({
    where: { code: ConsultationCode.ENT_02 },
    update: { price: new Prisma.Decimal(40000) },
    create: {
      code: ConsultationCode.ENT_02,
      name: "Entrenamiento",
      description: "Asesoría y planificación de entrenamiento.",
      durationMinutes: 60,
      price: new Prisma.Decimal(40000),
      allowsOnline: true,
      allowsPresencial: true,
      morningOnly: false,
    },
  });

  await prisma.consultationType.upsert({
    where: { code: ConsultationCode.ANT_03 },
    update: { price: new Prisma.Decimal(25000) },
    create: {
      code: ConsultationCode.ANT_03,
      name: "Antropometría",
      description: "Mediciones corporales. Solo presencial y matutino.",
      durationMinutes: 45,
      price: new Prisma.Decimal(25000),
      allowsOnline: false,
      allowsPresencial: true,
      morningOnly: true,
      morningStart: "08:00",
      morningEnd: "12:00",
    },
  });

  const adminEmail = "admin@gmail.com";
  const passwordHash = await bcrypt.hash("Admin123", 10);
  await prisma.user.upsert({
    where: { email: adminEmail },
    update: { emailVerified: new Date() },
    create: {
      email: adminEmail,
      name: "Lic. Ma Antonieta Lanza",
      role: "ADMIN",
      passwordHash,
      emailVerified: new Date(),
    },
  });

  for (const [slug, content] of Object.entries(SITE_CONTENT_DEFAULTS)) {
    await prisma.siteContent.upsert({
      where: { slug },
      update: {},
      create: {
        slug,
        title: content.title,
        data: content.data as unknown as Prisma.InputJsonValue,
      },
    });
  }

  for (const [code, template] of Object.entries(DEFAULT_FORM_TEMPLATES)) {
    await prisma.formTemplate.upsert({
      where: { code },
      update: {
        name: template.name,
        fields: template.fields as unknown as Prisma.InputJsonValue,
      },
      create: {
        code,
        name: template.name,
        fields: template.fields as unknown as Prisma.InputJsonValue,
      },
    });
  }

  await prisma.resource.upsert({
    where: { id: "seed-resource-guia" },
    update: {},
    create: {
      id: "seed-resource-guia",
      title: "Guía de hábitos saludables Anttova",
      description:
        "Introducción a hábitos sostenibles para tu bienestar diario.",
      type: "EBOOK",
      category: "Nutrición",
      price: new Prisma.Decimal(0),
      currency: "ARS",
      isPublished: true,
      sortOrder: 1,
      body: "Material introductorio gratuito para nuevos pacientes.",
    },
  });

  console.log("Seed completado: consultas, admin, CMS, recurso demo.");
  console.log(`Admin -> ${adminEmail} / Admin123`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
