"use client";

import { PdfMedia } from "@/components/media/pdf-media";

/** Campo monolítico de un PDF — compuesto con PdfMedia por defecto. */
export function PdfUploadField({
  label,
  value,
  onChange,
  hint,
  folder = "cv",
}: {
  label: string;
  value: string;
  onChange: (url: string) => void;
  hint?: string;
  folder?: string;
}) {
  return (
    <PdfMedia.Root
      value={value}
      onChange={onChange}
      folder={folder}
      hint={hint}
    >
      <PdfMedia.Label>{label}</PdfMedia.Label>
      <PdfMedia.Hint />
      <PdfMedia.UrlField />
      <PdfMedia.FileChip />
      <PdfMedia.Actions>
        <PdfMedia.UploadButton />
        <PdfMedia.ClearButton />
      </PdfMedia.Actions>
      <PdfMedia.ErrorText />
    </PdfMedia.Root>
  );
}
