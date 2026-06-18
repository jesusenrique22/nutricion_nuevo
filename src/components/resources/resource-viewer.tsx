import type { ResourceDTO } from "@/server/actions/resource.queries";
import { guessContentKindFromUrl } from "@/lib/stored-file";
import { ProtectedContentViewer } from "@/components/resources/protected-content-viewer";

export function ResourceViewer({ resource }: { resource: ResourceDTO }) {
  const contentKind = guessContentKindFromUrl(
    resource.contentUrl,
    resource.type,
  );

  return (
    <div className="space-y-6">
      {resource.body && (
        <div className="rounded-3xl border border-foreground/10 bg-white p-6">
          <div className="prose prose-sm max-w-none text-foreground/80">
            <p className="whitespace-pre-wrap">{resource.body}</p>
          </div>
        </div>
      )}

      <ProtectedContentViewer
        resourceId={resource.id}
        title={resource.title}
        contentKind={contentKind}
        hasVideo={Boolean(resource.type === "VIDEO" && resource.videoUrl)}
        hasContent={Boolean(
          (resource.type === "EBOOK" || resource.contentUrl) &&
            resource.contentUrl,
        )}
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
