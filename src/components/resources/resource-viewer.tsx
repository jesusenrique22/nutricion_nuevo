import type { ResourceDTO } from "@/server/actions/resource.queries";
import { ProtectedContentViewer } from "@/components/resources/protected-content-viewer";

export function ResourceViewer({
  resource,
}: {
  resource: ResourceDTO;
}) {
  // El tipo ya viene resuelto del servidor: la ruta del archivo no se manda al
  // navegador para que el PDF solo sea accesible a través del visor.
  const contentKind = resource.contentKind;
  const hasContent = resource.hasContent;

  return (
    <div className="space-y-6">
      {resource.description && (
        <p className="text-sm leading-relaxed text-foreground/65">
          {resource.description}
        </p>
      )}

      {resource.body && (
        <div className="rounded-3xl border border-foreground/10 bg-white p-6">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-foreground/45">
            Información del recurso
          </p>
          <div className="prose prose-sm mt-3 max-w-none text-foreground/80">
            <p className="whitespace-pre-wrap">{resource.body}</p>
          </div>
        </div>
      )}

      <ProtectedContentViewer
        resourceId={resource.id}
        title={resource.title}
        contentKind={contentKind}
        hasVideo={resource.type === "VIDEO" && resource.hasVideo}
        hasContent={hasContent}
      />

      {resource.type === "LINK" && resource.linkUrl && (
        <div className="rounded-3xl border border-foreground/10 bg-white p-6">
          <div
            className="overflow-hidden rounded-2xl ring-1 ring-foreground/10"
            onContextMenu={(e) => e.preventDefault()}
          >
            <iframe
              src={resource.linkUrl}
              title={resource.title}
              className="h-[60vh] w-full"
              sandbox="allow-scripts allow-same-origin allow-popups"
            />
          </div>
        </div>
      )}
    </div>
  );
}
