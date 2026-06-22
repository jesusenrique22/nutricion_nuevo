import { PrismaClient, Prisma } from "@prisma/client";
import bcrypt from "bcryptjs";
import { DEFAULT_FORM_TEMPLATES, SITE_CONTENT_DEFAULTS } from "./seed-data";

const prisma = new PrismaClient();

type ConsultationSeed = {
  code: string;
  name: string;
  description: string;
  durationMinutes: number;
  price: number;
  allowsOnline: boolean;
  allowsPresencial: boolean;
  morningOnly: boolean;
  morningStart?: string;
  morningEnd?: string;
  sortOrder: number;
  isPublished: boolean;
};

const CONSULTATION_TYPES: ConsultationSeed[] = [
  {
    code: "NUT_01",
    name: "Consulta Nutricional",
    description: "Evaluación y plan nutricional personalizado.",
    durationMinutes: 60,
    price: 35000,
    allowsOnline: true,
    allowsPresencial: true,
    morningOnly: false,
    sortOrder: 1,
    isPublished: true,
  },
  {
    code: "ENT_02",
    name: "Entrenamiento",
    description: "Asesoría y planificación de entrenamiento.",
    durationMinutes: 60,
    price: 40000,
    allowsOnline: true,
    allowsPresencial: true,
    morningOnly: false,
    sortOrder: 2,
    isPublished: true,
  },
  {
    code: "ANT_03",
    name: "Antropometría",
    description: "Mediciones corporales. Solo presencial y matutino.",
    durationMinutes: 45,
    price: 25000,
    allowsOnline: false,
    allowsPresencial: true,
    morningOnly: true,
    morningStart: "08:00",
    morningEnd: "12:00",
    sortOrder: 3,
    isPublished: true,
  },
];

function consultationCreateInput(row: ConsultationSeed) {
  return {
    code: row.code,
    name: row.name,
    description: row.description,
    durationMinutes: row.durationMinutes,
    price: new Prisma.Decimal(row.price),
    allowsOnline: row.allowsOnline,
    allowsPresencial: row.allowsPresencial,
    morningOnly: row.morningOnly,
    morningStart: row.morningStart ?? null,
    morningEnd: row.morningEnd ?? null,
    sortOrder: row.sortOrder,
    isPublished: row.isPublished,
  };
}

function consultationUpdateInput(row: ConsultationSeed) {
  return {
    name: row.name,
    description: row.description,
    durationMinutes: row.durationMinutes,
    price: new Prisma.Decimal(row.price),
    allowsOnline: row.allowsOnline,
    allowsPresencial: row.allowsPresencial,
    morningOnly: row.morningOnly,
    morningStart: row.morningStart ?? null,
    morningEnd: row.morningEnd ?? null,
    sortOrder: row.sortOrder,
    isPublished: row.isPublished,
  };
}

async function seedConsultationTypes() {
  for (const row of CONSULTATION_TYPES) {
    await prisma.consultationType.upsert({
      where: { code: row.code } as Prisma.ConsultationTypeWhereUniqueInput,
      update: consultationUpdateInput(row) as Prisma.ConsultationTypeUpdateInput,
      create: consultationCreateInput(row) as Prisma.ConsultationTypeUncheckedCreateInput,
    });
  }
}

async function seedAdminUser() {
  const adminEmail = "admin@gmail.com";
  const passwordHash = await bcrypt.hash("Admin123", 10);

  const admin = await prisma.user.upsert({
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

  await prisma.$executeRaw`
    UPDATE "User"
    SET "isDefaultCalendarAdmin" = true
    WHERE "id" = ${admin.id}
  `;

  return adminEmail;
}

async function main() {
  await seedConsultationTypes();

  const adminEmail = await seedAdminUser();

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
