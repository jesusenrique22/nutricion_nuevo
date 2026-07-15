import type { ResourceDTO } from "@/server/actions/resource.queries";
import { guessContentKindFromUrl } from "@/lib/content-kind";
import { ProtectedContentViewer } from "@/components/resources/protected-content-viewer";

export function ResourceViewer({
  resource,
}: {
  resource: ResourceDTO;
}) {
  // Solo heurística por URL/tipo — no abrir Mongo aquí (evita meter mongodb
  // en el bundle SSR de /dashboard/patient/library/[id]).
  const contentKind = guessContentKindFromUrl(
    resource.contentUrl,
    resource.type,
  );
  const hasContent = Boolean(resource.contentUrl);

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
        hasVideo={Boolean(resource.type === "VIDEO" && resource.videoUrl)}
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
