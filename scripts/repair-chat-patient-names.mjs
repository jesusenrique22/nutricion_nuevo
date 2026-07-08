#!/usr/bin/env node
/**
 * Sincroniza nombres de pacientes en conversaciones de MongoDB con PostgreSQL.
 * Uso: node scripts/repair-chat-patient-names.mjs
 */
import { createPrismaClient } from "./create-prisma-client.mjs";
import { MongoClient } from "mongodb";

const prisma = createPrismaClient();
const mongoUri = process.env.MONGODB_URI;
const dbName = process.env.MONGODB_DB ?? "nutricion_chat";

if (!mongoUri) {
  console.error("Falta MONGODB_URI en el entorno.");
  process.exit(1);
}

async function getAdminIds() {
  const admins = await prisma.user.findMany({
    where: { role: "ADMIN" },
    select: { id: true },
  });
  return new Set(admins.map((a) => a.id));
}

async function findPatientUserInIds(ids) {
  const unique = [...new Set(ids.filter(Boolean))];
  for (const id of unique) {
    const user = await prisma.user.findUnique({
      where: { id },
      select: { id: true, name: true, email: true, role: true },
    });
    if (user?.role === "PATIENT" && user.name?.trim()) {
      return user;
    }
  }
  return null;
}

async function inferArchivedPatientId(conv, adminIds) {
  const live = await findPatientUserInIds([
    conv.patientId,
    ...(conv.participants ?? []),
  ]);
  if (live) return live.id;

  const conventionPatient = conv.participants?.[1];
  if (conventionPatient && !adminIds.has(conventionPatient)) {
    return conventionPatient;
  }

  const nonCurrentAdmins = (conv.participants ?? []).filter(
    (id) => !adminIds.has(id),
  );
  return conv.patientId ?? nonCurrentAdmins[0] ?? null;
}

async function resolveDisplay(conv, adminIds) {
  const patient = await findPatientUserInIds([
    conv.patientId,
    ...(conv.participants ?? []),
  ]);

  if (patient) {
    return {
      patientId: patient.id,
      patientName: patient.name.trim(),
      patientEmail: patient.email,
    };
  }

  const archivedId = await inferArchivedPatientId(conv, adminIds);

  if (conv.patientName?.trim()) {
    return {
      patientId: archivedId,
      patientName: conv.patientName.trim(),
      patientEmail: conv.patientEmail ?? null,
    };
  }

  return {
    patientId: archivedId,
    patientName: archivedId ? "Paciente (sin ficha)" : "Paciente",
    patientEmail: null,
  };
}

async function main() {
  const mongo = new MongoClient(mongoUri);
  await mongo.connect();
  const db = mongo.db(dbName);
  const col = db.collection("conversations");
  const adminIds = await getAdminIds();
  const convs = await col.find({}).toArray();

  console.log(`Revisando ${convs.length} conversaciones…\n`);

  let updated = 0;
  let orphans = 0;

  for (const conv of convs) {
    const display = await resolveDisplay(conv, adminIds);
    const updates = {};

    if (display.patientId && display.patientId !== conv.patientId) {
      updates.patientId = display.patientId;
    }
    if (
      display.patientName &&
      display.patientName !== conv.patientName &&
      !display.patientName.includes("(sin ficha)")
    ) {
      updates.patientName = display.patientName;
    }
    if (display.patientEmail && display.patientEmail !== conv.patientEmail) {
      updates.patientEmail = display.patientEmail;
    }

    if (Object.keys(updates).length > 0) {
      await col.updateOne({ _id: conv._id }, { $set: updates });
      updated += 1;
      console.log(`✓ ${conv._id} → ${display.patientName} (${display.patientId})`);
    } else if (display.patientName.includes("(sin ficha)")) {
      orphans += 1;
      console.log(
        `⚠ ${conv._id} — cuenta ${display.patientId} ya no está en PostgreSQL`,
      );
    } else {
      console.log(`· ${conv._id} — ${display.patientName} (sin cambios)`);
    }
  }

  console.log(`\nListo: ${updated} actualizadas, ${orphans} huérfanas.`);
  if (orphans > 0) {
    console.log(
      "\nEsas conversaciones son de cuentas eliminadas. Pedí al paciente que abra el chat de nuevo.",
    );
  }

  await prisma.$disconnect();
  await mongo.close();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
