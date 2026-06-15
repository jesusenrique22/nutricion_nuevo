import { prisma } from "@/server/db/prisma";
import type { ConversationDoc } from "@/types/chat";

let adminIdsCache: Set<string> | null = null;

export async function getAdminUserIds(): Promise<Set<string>> {
  if (adminIdsCache) return adminIdsCache;

  const admins = await prisma.user.findMany({
    where: { role: "ADMIN" },
    select: { id: true },
  });
  adminIdsCache = new Set(admins.map((a) => a.id));
  return adminIdsCache;
}

async function findPatientUserInIds(ids: string[]) {
  const unique = [...new Set(ids.filter(Boolean))];
  for (const id of unique) {
    const user = await prisma.user.findUnique({
      where: { id },
      select: { id: true, name: true, email: true, role: true },
    });
    if (user?.role === "PATIENT") return user;
  }
  return null;
}

/** Repara patientId cuando quedó apuntando a un admin viejo en participants. */
async function inferArchivedPatientId(
  conv: Pick<ConversationDoc, "patientId" | "participants">,
): Promise<string | null> {
  const live = await findPatientUserInIds([
    conv.patientId,
    ...conv.participants,
  ]);
  if (live) return live.id;

  const adminIds = await getAdminUserIds();

  // Convención al crear: [adminId, patientId, ...]
  const conventionPatient = conv.participants[1];
  if (conventionPatient && !adminIds.has(conventionPatient)) {
    return conventionPatient;
  }

  const nonCurrentAdmins = conv.participants.filter((id) => !adminIds.has(id));
  if (nonCurrentAdmins.length === 1) {
    return nonCurrentAdmins[0] ?? null;
  }

  return conv.patientId ?? nonCurrentAdmins[0] ?? null;
}

/** Id del paciente verificando rol en PostgreSQL (ignora admins viejos en participants). */
export async function resolvePatientIdFromConversation(
  conv: Pick<ConversationDoc, "patientId" | "participants">,
): Promise<string | null> {
  const candidates = [
    conv.patientId,
    ...conv.participants.filter((id) => id !== conv.patientId),
  ];

  const patient = await findPatientUserInIds(candidates);
  if (patient) return patient.id;

  if (conv.patientId) return conv.patientId;

  return null;
}

export type ResolvedPatientDisplay = {
  patientId: string | null;
  patientName: string;
  patientEmail: string | null;
};

export async function resolvePatientDisplay(
  conv: Pick<
    ConversationDoc,
    "patientId" | "participants" | "patientName" | "patientEmail" | "appointmentId"
  >,
): Promise<ResolvedPatientDisplay> {
  const patientFromIds = await findPatientUserInIds([
    conv.patientId,
    ...conv.participants,
  ]);

  if (patientFromIds?.name.trim()) {
    return {
      patientId: patientFromIds.id,
      patientName: patientFromIds.name.trim(),
      patientEmail: patientFromIds.email,
    };
  }

  if (conv.appointmentId) {
    const appointment = await prisma.appointment.findUnique({
      where: { id: conv.appointmentId },
      select: {
        patient: { select: { id: true, name: true, email: true } },
      },
    });
    if (appointment?.patient?.name.trim()) {
      return {
        patientId: appointment.patient.id,
        patientName: appointment.patient.name.trim(),
        patientEmail: appointment.patient.email,
      };
    }
  }

  const storedName = conv.patientName?.trim();
  if (storedName) {
    return {
      patientId: conv.patientId ?? null,
      patientName: storedName,
      patientEmail: conv.patientEmail ?? null,
    };
  }

  const storedEmail = conv.patientEmail?.trim();
  if (storedEmail) {
    return {
      patientId: conv.patientId ?? null,
      patientName: storedEmail.split("@")[0] ?? "Paciente",
      patientEmail: storedEmail,
    };
  }

  const archivedId = await inferArchivedPatientId(conv);

  return {
    patientId: archivedId,
    patientName: archivedId ? "Paciente (sin ficha)" : "Paciente",
    patientEmail: null,
  };
}

export async function fetchPatientProfile(patientId: string) {
  return prisma.user.findUnique({
    where: { id: patientId },
    select: { id: true, name: true, email: true, role: true },
  });
}
