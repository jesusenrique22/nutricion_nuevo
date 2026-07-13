"use client";

import { ClientPdfDocumentViewer } from "@/components/pdf/client-pdf-document-viewer";

export function ResourcePdfViewer({
  resourceId,
  title,
}: {
  resourceId: string;
  title: string;
}) {
  return (
    <div className="space-y-4">
      <p className="sr-only">{title}</p>
      <ClientPdfDocumentViewer
        pdfUrl={`/api/resources/${resourceId}/content`}
        maxWidth={1100}
        className="overflow-hidden rounded-2xl bg-muted/20 ring-1 ring-foreground/10 select-none"
      />
    </div>
  );
}
