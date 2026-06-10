"use client";

import type { ChatFileDTO } from "@/server/actions/chat.actions";

function fmtDate(iso: string) {
  return new Date(iso).toLocaleString("es", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function fmtSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function fileIcon(mimeType: string, type: string) {
  if (mimeType.startsWith("image/") || type === "IMAGE") return "🖼️";
  if (mimeType.startsWith("video/") || type === "VIDEO") return "🎬";
  if (mimeType === "application/pdf" || type === "PDF") return "📄";
  return "📎";
}

export function ChatFilesPanel({
  files,
  loading,
}: {
  files: ChatFileDTO[];
  loading?: boolean;
}) {
  if (loading) {
    return (
      <div className="flex flex-1 items-center justify-center p-8 text-sm text-foreground/50">
        Cargando archivos…
      </div>
    );
  }

  if (files.length === 0) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center p-8 text-center">
        <div className="text-4xl opacity-30">📁</div>
        <p className="mt-4 text-sm font-semibold text-foreground/70">
          Sin archivos compartidos
        </p>
        <p className="mt-1 max-w-xs text-xs text-foreground/50">
          Los documentos, imágenes y videos que envíen en el chat aparecerán
          aquí para un acceso rápido.
        </p>
      </div>
    );
  }

  return (
    <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-4">
      <p className="mb-3 text-xs font-semibold uppercase tracking-[0.14em] text-foreground/45">
        {files.length} archivo{files.length === 1 ? "" : "s"} compartido
        {files.length === 1 ? "" : "s"}
      </p>
      <div className="grid gap-3 sm:grid-cols-2">
        {files.map((file) => (
          <a
            key={file.id}
            href={file.url}
            target="_blank"
            rel="noreferrer"
            className="group flex gap-3 rounded-xl border border-foreground/10 bg-white p-3 transition hover:border-primary/25 hover:shadow-sm"
          >
            <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-lg bg-muted">
              {file.mimeType.startsWith("image/") ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={file.url}
                  alt={file.fileName}
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-2xl">
                  {fileIcon(file.mimeType, file.type)}
                </div>
              )}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-bold text-foreground group-hover:text-primary">
                {file.fileName}
              </p>
              <p className="mt-0.5 text-xs text-foreground/50">
                {file.isMine ? "Tú" : file.senderName} · {fmtSize(file.sizeBytes)}
              </p>
              <p className="mt-0.5 text-[10px] text-foreground/40">
                {fmtDate(file.createdAt)}
              </p>
            </div>
          </a>
        ))}
      </div>
    </div>
  );
}
