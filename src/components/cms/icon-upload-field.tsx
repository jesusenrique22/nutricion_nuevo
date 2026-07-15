"use client";

import { IconMedia } from "@/components/media/icon-media";

/** Campo de icono/logo/avatar — compuesto con IconMedia por defecto. */
export function IconUploadField({
  label,
  value,
  onChange,
  hint,
  folder = "brand",
  onUploaded,
  objectFit = "contain",
}: {
  label: string;
  value: string;
  onChange: (url: string) => void;
  hint?: string;
  folder?: string;
  onUploaded?: (url: string) => void | Promise<void>;
  objectFit?: "cover" | "contain";
}) {
  return (
    <IconMedia.Root
      value={value}
      onChange={onChange}
      folder={folder}
      hint={hint}
      onUploaded={onUploaded}
    >
      <IconMedia.Label>{label}</IconMedia.Label>
      <IconMedia.Hint />
      <IconMedia.UrlField />
      <IconMedia.Preview objectFit={objectFit} />
      <IconMedia.Actions>
        <IconMedia.UploadButton />
        <IconMedia.ClearButton />
      </IconMedia.Actions>
      <IconMedia.Library />
      <IconMedia.StatusModal />
    </IconMedia.Root>
  );
}
