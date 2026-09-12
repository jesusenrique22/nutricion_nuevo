"use client";

import { useEffect, useState } from "react";
import { quickStoredFileLabel } from "@/lib/stored-file-label";
import { resolveStoredFileLabel } from "@/server/actions/media-label.actions";

export function StoredFileName({
  url,
  fallback = "documento.pdf",
  className,
}: {
  url: string;
  fallback?: string;
  className?: string;
}) {
  const [label, setLabel] = useState(() =>
    quickStoredFileLabel(url, fallback),
  );

  useEffect(() => {
    const quick = quickStoredFileLabel(url, fallback);
    setLabel(quick);
    if (url.includes("/api/media/")) {
      void resolveStoredFileLabel(url).then(setLabel);
    }
  }, [url, fallback]);

  return <span className={className}>{label}</span>;
}
