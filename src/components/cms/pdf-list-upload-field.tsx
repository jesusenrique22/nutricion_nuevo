"use client";

import { PdfMedia } from "@/components/media/pdf-media";

/** Lista de PDFs — compuesto con PdfMedia.ListRoot por defecto. */
export function PdfListUploadField({
  label,
  values,
  onChange,
  hint,
  folder = "cv",
}: {
  label: string;
  values: string[];
  onChange: (urls: string[]) => void;
  hint?: string;
  folder?: string;
}) {
  return (
    <PdfMedia.ListRoot
      values={values}
      onChange={onChange}
      folder={folder}
      hint={hint}
    >
      <PdfMedia.Label>{label}</PdfMedia.Label>
      <PdfMedia.Hint />
      <PdfMedia.ListItems emptyMessage="Todavía no hay PDFs. Subí uno o más archivos del CV." />
      <div className="mt-3">
        <PdfMedia.UploadButton list />
      </div>
      <PdfMedia.ErrorText />
    </PdfMedia.ListRoot>
  );
}
