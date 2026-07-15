"use client";

import { ImageMedia } from "@/components/media/image-media";

/** Campo monolítico de imagen — compuesto con ImageMedia por defecto. */
export function ImageUploadField({
  label,
  value,
  onChange,
  hint,
  folder = "site",
  onUploaded,
}: {
  label: string;
  value: string;
  onChange: (url: string) => void;
  hint?: string;
  folder?: string;
  onUploaded?: (url: string) => void | Promise<void>;
}) {
  return (
    <ImageMedia.Root
      value={value}
      onChange={onChange}
      folder={folder}
      hint={hint}
      onUploaded={onUploaded}
    >
      <ImageMedia.Label>{label}</ImageMedia.Label>
      <ImageMedia.Hint />
      <ImageMedia.UrlField />
      <ImageMedia.Preview />
      <ImageMedia.Actions>
        <ImageMedia.UploadButton />
        <ImageMedia.ClearButton />
      </ImageMedia.Actions>
      <ImageMedia.Library />
      <ImageMedia.StatusModal />
    </ImageMedia.Root>
  );
}
