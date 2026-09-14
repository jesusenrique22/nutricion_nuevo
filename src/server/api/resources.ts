import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { detectBufferMimeType } from "@/lib/detect-buffer-mime";
import { isPublicMediaFolder } from "@/lib/media-access-policy";
import { revalidatePublicSiteMediaCache } from "@/lib/public-site-media";
import {
  CHUNKED_UPLOAD_PART_BYTES,
  type UploadKind,
  resolveUploadMime,
  validateUploadMetadata,
} from "@/lib/upload-policy";
import { limitUploadByKey } from "@/lib/ratelimit";
import {
  cancelChunkedUpload,
  completeChunkedUpload,
  initChunkedUpload,
  storeChunkedUploadPart,
} from "@/server/services/chunked-upload.service";
import { processAdminMediaUpload } from "@/server/services/admin-media-upload.service";
import { registerMediaAsset } from "@/server/services/media-library.service";
import {
  canAccessResourceContent,
  canAccessResourceVideo,
} from "@/server/services/media-access.service";
import {
  normalizeStoredUrl,
  openStoredFileUrl,
  readStoredFileUrlToBuffer,
  storedFileToResponse,
} from "@/lib/stored-file";
import { prisma } from "@/server/db/prisma";


type RouteContext = { params: Promise<{ path: string[] }> };

async function requireAdmin() {
  const session = await auth();
  if (session?.user?.role !== "ADMIN" || !session.user.id) return null;
  return session;
}

async function handleDirectUpload(req: NextRequest) {
  const session = await requireAdmin();
  if (!session) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const rl = await limitUploadByKey(`admin:${session.user.id}`);
  if (!rl.success) {
    return NextResponse.json(
      { error: "Demasiadas subidas. Esperá unos segundos." },
      { status: 429 },
    );
  }

  const formData = await req.formData();
  const file = formData.get("file");
  const folder = formData.get("folder");
  const kindRaw = formData.get("kind");

  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Archivo requerido" }, { status: 400 });
  }

  const safeFolder =
    typeof folder === "string" && /^[\w-]+$/.test(folder)
      ? folder
      : "resources";

  const kind =
    kindRaw === "pdf" ||
    kindRaw === "image" ||
    kindRaw === "video" ||
    kindRaw === "proof" ||
    kindRaw === "any"
      ? (kindRaw as UploadKind)
      : "any";

  const result = await processAdminMediaUpload(file, {
    folder: safeFolder,
    kind,
    ownerId: session.user.id,
  });

  if (!result.ok) {
    return NextResponse.json({ error: result.message }, { status: 400 });
  }

  return NextResponse.json({
    url: result.url,
    mimeType: result.mimeType,
    fileName: result.fileName,
    id: result.id,
  });
}

async function handleInit(req: NextRequest) {
  const session = await requireAdmin();
  if (!session) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const rl = await limitUploadByKey(`admin-chunk-init:${session.user.id}`);
  if (!rl.success) {
    return NextResponse.json(
      { error: "Demasiadas subidas. Esperá unos segundos." },
      { status: 429 },
    );
  }

  const body = (await req.json()) as {
    fileName?: string;
    mimeType?: string;
    folder?: string;
    kind?: UploadKind;
    totalSize?: number;
  };

  const fileName = body.fileName?.trim();
  const totalSize = body.totalSize;
  const folder =
    typeof body.folder === "string" && /^[\w-]+$/.test(body.folder)
      ? body.folder
      : "resources";
  const kind =
    body.kind === "pdf" ||
    body.kind === "image" ||
    body.kind === "video" ||
    body.kind === "proof"
      ? body.kind
      : "any";

  if (!fileName || typeof totalSize !== "number" || totalSize <= 0) {
    return NextResponse.json({ error: "Datos inválidos." }, { status: 400 });
  }

  const mimeType =
    body.mimeType?.trim() || resolveUploadMime(new File([], fileName));

  const validation = validateUploadMetadata(
    fileName,
    mimeType,
    totalSize,
    kind,
  );
  if (!validation.ok) {
    return NextResponse.json({ error: validation.message }, { status: 400 });
  }

  const totalChunks = Math.ceil(totalSize / CHUNKED_UPLOAD_PART_BYTES);
  const uploadSession = await initChunkedUpload({
    ownerId: session.user.id,
    fileName,
    mimeType: validation.mime,
    folder,
    kind,
    totalSize,
    totalChunks,
  });

  return NextResponse.json(uploadSession);
}

async function handleChunk(req: NextRequest) {
  const session = await requireAdmin();
  if (!session) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const rl = await limitUploadByKey(`admin-chunk:${session.user.id}`);
  if (!rl.success) {
    return NextResponse.json(
      { error: "Demasiadas subidas. Esperá unos segundos." },
      { status: 429 },
    );
  }

  const formData = await req.formData();
  const sessionId = formData.get("sessionId");
  const chunkIndexRaw = formData.get("chunkIndex");
  const chunk = formData.get("chunk");

  if (
    typeof sessionId !== "string" ||
    typeof chunkIndexRaw !== "string" ||
    !(chunk instanceof Blob)
  ) {
    return NextResponse.json({ error: "Datos inválidos." }, { status: 400 });
  }

  const chunkIndex = Number(chunkIndexRaw);
  if (!Number.isInteger(chunkIndex) || chunkIndex < 0) {
    return NextResponse.json({ error: "Índice inválido." }, { status: 400 });
  }

  const buffer = Buffer.from(await chunk.arrayBuffer());
  if (buffer.length === 0) {
    return NextResponse.json({ error: "Fragmento vacío." }, { status: 400 });
  }

  const progress = await storeChunkedUploadPart({
    sessionId,
    ownerId: session.user.id,
    chunkIndex,
    data: buffer,
  });

  return NextResponse.json(progress);
}

async function handleComplete(req: NextRequest) {
  const session = await requireAdmin();
  if (!session) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const rl = await limitUploadByKey(`admin-chunk-complete:${session.user.id}`);
  if (!rl.success) {
    return NextResponse.json(
      { error: "Demasiadas subidas. Esperá unos segundos." },
      { status: 429 },
    );
  }

  const body = (await req.json()) as { sessionId?: string };
  if (!body.sessionId?.trim()) {
    return NextResponse.json({ error: "Sesión inválida." }, { status: 400 });
  }

  const stored = await completeChunkedUpload({
    sessionId: body.sessionId.trim(),
    ownerId: session.user.id,
  });

  let assetId: string | undefined;
  if (stored.mimeType.startsWith("image/")) {
    const asset = await registerMediaAsset(stored, {
      folder: stored.folder,
      fileName: stored.fileName,
      ownerId: session.user.id,
    });
    assetId = asset.id;
  }

  if (isPublicMediaFolder("resources")) {
    revalidatePublicSiteMediaCache();
    revalidatePath("/");
    revalidatePath("/login");
    revalidatePath("/register");
    revalidatePath("/dashboard/admin/personalizar");
  }

  revalidatePath("/dashboard/admin/resources");

  return NextResponse.json({
    url: stored.url,
    mimeType: stored.mimeType,
    id: assetId,
  });
}

async function handleCancel(req: NextRequest) {
  const session = await requireAdmin();
  if (!session) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const body = (await req.json()) as { sessionId?: string };
  if (!body.sessionId?.trim()) {
    return NextResponse.json({ error: "Sesión inválida." }, { status: 400 });
  }

  await cancelChunkedUpload({
    sessionId: body.sessionId.trim(),
    ownerId: session.user.id,
  });

  return NextResponse.json({ ok: true });
}

async function handleContent(id: string) {
  const allowed = await canAccessResourceContent(id);
  if (!allowed) {
    const session = await auth();
    return new Response(session?.user ? "No autorizado" : "Inicia sesión", {
      status: session?.user ? 403 : 401,
    });
  }

  const resource = await prisma.resource.findUnique({
    where: { id },
    select: { contentUrl: true, type: true, title: true },
  });
  if (!resource?.contentUrl) {
    return new Response("Sin contenido", { status: 404 });
  }

  const contentUrl = normalizeStoredUrl(resource.contentUrl);
  const buffer = await readStoredFileUrlToBuffer(contentUrl);
  if (!buffer || buffer.length === 0) {
    console.warn(
      "[resources/content] archivo no encontrado o vacío",
      contentUrl,
    );
    return new Response(
      "Archivo no encontrado. Volvé a subir el PDF o archivo desde Admin → Recursos.",
      { status: 404 },
    );
  }

  const file = await openStoredFileUrl(contentUrl);
  const fallbackMime = file?.mimeType ?? "application/octet-stream";
  const mimeType = detectBufferMimeType(buffer, fallbackMime);
  const kind =
    mimeType.startsWith("image/")
      ? "image"
      : mimeType === "application/pdf"
        ? "pdf"
        : "unknown";

  return new Response(new Uint8Array(buffer), {
    headers: {
      "Content-Type": mimeType,
      "Content-Length": String(buffer.length),
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
      "X-Content-Kind": kind,
      "Content-Disposition": "inline",
    },
  });
}

async function handleVideo(id: string) {
  const resource = await prisma.resource.findUnique({
    where: { id },
    select: { videoUrl: true },
  });
  if (!resource?.videoUrl) {
    return new Response("Sin video", { status: 404 });
  }

  const allowed = await canAccessResourceVideo(id, resource.videoUrl);
  if (!allowed) {
    const session = await auth();
    return new Response(session?.user ? "No autorizado" : "Inicia sesión", {
      status: session?.user ? 403 : 401,
    });
  }

  const file = await openStoredFileUrl(resource.videoUrl);
  if (!file) {
    return new Response("Video no encontrado", { status: 404 });
  }

  return storedFileToResponse(file, { inline: true });
}

function contentKindFromMime(mimeType: string) {
  if (mimeType.startsWith("image/")) return "image";
  if (mimeType === "application/pdf") return "pdf";
  return "unknown";
}

function closeOpenedFile(file: { stream: { destroy?: () => void } }) {
  try {
    file.stream.destroy?.();
  } catch {
    // HEAD no consume el stream; cerrarlo evita fugas en GridFS.
  }
}

/** HEAD no puede bajar el PDF entero: el visor solo necesita tipo y permiso. */
async function handleContentHead(id: string) {
  const allowed = await canAccessResourceContent(id);
  if (!allowed) {
    const session = await auth();
    return new Response(null, { status: session?.user ? 403 : 401 });
  }

  const resource = await prisma.resource.findUnique({
    where: { id },
    select: { contentUrl: true },
  });
  if (!resource?.contentUrl) {
    return new Response(null, { status: 404 });
  }

  const file = await openStoredFileUrl(normalizeStoredUrl(resource.contentUrl));
  if (!file) {
    return new Response(null, { status: 404 });
  }
  closeOpenedFile(file);

  const mimeType = file.mimeType || "application/octet-stream";
  return new Response(null, {
    status: 200,
    headers: {
      "Content-Type": mimeType,
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
      "X-Content-Kind": contentKindFromMime(mimeType),
      "Content-Disposition": "inline",
    },
  });
}

export async function GET(_req: Request, context: RouteContext) {
  try {
    const path = (await context.params).path ?? [];
    if (path.length === 2 && path[1] === "content") {
      return handleContent(path[0]);
    }
    if (path.length === 2 && path[1] === "video") {
      return handleVideo(path[0]);
    }
    return new Response("No encontrado", { status: 404 });
  } catch (err) {
    console.error("[resources]", err);
    return new Response("Error al cargar contenido", { status: 500 });
  }
}

export async function HEAD(req: Request, context: RouteContext) {
  try {
    const path = (await context.params).path ?? [];
    if (path.length === 2 && path[1] === "content") {
      return handleContentHead(path[0]);
    }
    return GET(req, context);
  } catch (err) {
    console.error("[resources/head]", err);
    return new Response(null, { status: 500 });
  }
}

export async function POST(req: NextRequest, context: RouteContext) {
  try {
    const path = (await context.params).path ?? [];
    if (path[0] !== "upload") {
      return NextResponse.json({ error: "No encontrado" }, { status: 404 });
    }
    if (path.length === 1) return handleDirectUpload(req);
    if (path[1] === "init") return handleInit(req);
    if (path[1] === "chunk") return handleChunk(req);
    if (path[1] === "complete") return handleComplete(req);
    if (path[1] === "cancel") return handleCancel(req);
    return NextResponse.json({ error: "No encontrado" }, { status: 404 });
  } catch (err) {
    console.error("[resources/upload]", err);
    const message =
      err instanceof Error
        ? err.message
        : "No pudimos subir el archivo. Intentá de nuevo.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
