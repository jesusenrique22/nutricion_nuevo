"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ImageUploadField } from "@/components/cms/image-upload-field";
import { landingBlocksToRecord } from "@/lib/landing-blocks-parse";
import { updateSiteContent } from "@/server/actions/cms.actions";
import type {
  BannerBlock,
  BannerLayout,
  CarouselBlock,
  CarouselSize,
  LandingBlock,
  LandingBlockKind,
  LandingBlockPlacement,
  LandingBlocksData,
} from "@/types/landing-blocks";
import {
  BANNER_LAYOUT_LABELS,
  CAROUSEL_SIZE_LABELS,
  LANDING_BLOCK_KIND_LABELS,
  LANDING_BLOCK_PLACEMENTS,
  LANDING_BLOCKS_SLUG,
} from "@/types/landing-blocks";

const inputClass =
  "mt-1 w-full rounded-xl border border-foreground/15 px-3 py-2 text-sm outline-none focus:border-primary";

function newId(prefix: string): string {
  return `${prefix}-${Date.now().toString(36)}-${Math.floor(
    Math.random() * 1000,
  )}`;
}

function createBlock(kind: LandingBlockKind): LandingBlock {
  if (kind === "carousel") {
    const block: CarouselBlock = {
      id: newId("carousel"),
      kind: "carousel",
      enabled: true,
      placement: "after_hero",
      title: "Nuevo carrusel",
      reverse: false,
      size: "md",
      items: [{ src: "", alt: "Nueva imagen" }],
    };
    return block;
  }
  const block: BannerBlock = {
    id: newId("banner"),
    kind: "banner",
    enabled: true,
    placement: "after_packages",
    eyebrow: "",
    title: "Nuevo banner",
    text: "Describe aquí tu producto o mensaje.",
    imageSrc: "",
    imageAlt: "",
    ctaLabel: "",
    ctaHref: "",
    layout: "image-right",
  };
  return block;
}

function placementLabel(placement: LandingBlockPlacement): string {
  return (
    LANDING_BLOCK_PLACEMENTS.find((p) => p.id === placement)?.label ?? placement
  );
}

function UnsavedBanner({
  dirty,
  isPending,
  onSave,
  message,
}: {
  dirty: boolean;
  isPending: boolean;
  onSave: () => void;
  message: string | null;
}) {
  if (!dirty && !message) return null;
  return (
    <div
      className={`flex flex-wrap items-center justify-between gap-3 rounded-2xl px-4 py-3 text-sm transition ${
        message
          ? message.includes("guardad")
            ? "border border-green-200 bg-green-50 text-green-800"
            : "border border-red-200 bg-red-50 text-red-800"
          : "border border-amber-200 bg-amber-50 text-amber-800"
      }`}
    >
      <span className="font-semibold">
        {message ?? "Tenés cambios sin guardar."}
      </span>
      {dirty && (
        <button
          type="button"
          disabled={isPending}
          onClick={onSave}
          className="rounded-full bg-amber-700 px-4 py-1.5 text-xs font-bold text-white disabled:opacity-50"
        >
          {isPending ? "Guardando…" : "Guardar ahora"}
        </button>
      )}
    </div>
  );
}

export function LandingBlocksEditor({
  initial,
  onLiveChange,
}: {
  initial: LandingBlocksData;
  onLiveChange?: (data: LandingBlocksData) => void;
}) {
  const router = useRouter();
  const [data, setData] = useState(initial);
  const [activeId, setActiveId] = useState<string | null>(
    initial.blocks[0]?.id ?? null,
  );
  const [message, setMessage] = useState<string | null>(null);
  const [dirty, setDirty] = useState(false);
  const [isPending, startTransition] = useTransition();
  const savedRef = useRef(initial);

  useEffect(() => {
    if (message?.includes("guardad")) {
      savedRef.current = data;
      setDirty(false);
      const t = setTimeout(() => setMessage(null), 3000);
      return () => clearTimeout(t);
    }
  }, [message, data]);

  function update(next: LandingBlocksData) {
    setData(next);
    setDirty(true);
    setMessage(null);
    onLiveChange?.(next);
  }

  function updateBlock(id: string, patch: Partial<LandingBlock>) {
    const next = {
      blocks: data.blocks.map((b) =>
        b.id === id ? ({ ...b, ...patch } as LandingBlock) : b,
      ),
    };
    update(next);
  }

  function addBlock(kind: LandingBlockKind) {
    const block = createBlock(kind);
    update({ blocks: [...data.blocks, block] });
    setActiveId(block.id);
  }

  function removeBlock(id: string) {
    const block = data.blocks.find((b) => b.id === id);
    if (
      !confirm(
        `¿Eliminar la sección «${block?.title || "sin título"}» del inicio?`,
      )
    ) {
      return;
    }
    const next = { blocks: data.blocks.filter((b) => b.id !== id) };
    update(next);
    if (activeId === id) setActiveId(next.blocks[0]?.id ?? null);
  }

  function moveBlock(id: string, direction: -1 | 1) {
    const index = data.blocks.findIndex((b) => b.id === id);
    const target = index + direction;
    if (index < 0 || target < 0 || target >= data.blocks.length) return;
    const blocks = [...data.blocks];
    [blocks[index], blocks[target]] = [blocks[target], blocks[index]];
    update({ blocks });
  }

  function save() {
    setMessage(null);
    startTransition(async () => {
      const res = await updateSiteContent({
        slug: LANDING_BLOCKS_SLUG,
        title: "Secciones del inicio",
        data: landingBlocksToRecord(data),
      });
      setMessage(res.ok ? "Secciones guardadas." : res.message);
      if (res.ok) router.refresh();
    });
  }

  return (
    <div className="space-y-4">
      <UnsavedBanner
        dirty={dirty}
        isPending={isPending}
        onSave={save}
        message={message}
      />

      <div className="rounded-2xl border border-foreground/10 bg-white p-4">
        <p className="text-sm font-semibold">Agregar sección</p>
        <p className="mt-0.5 text-xs text-foreground/55">
          Elegí un tipo de bloque. Después podés reordenarlo y editar su
          contenido.
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          {(Object.keys(LANDING_BLOCK_KIND_LABELS) as LandingBlockKind[]).map(
            (kind) => (
              <button
                key={kind}
                type="button"
                onClick={() => addBlock(kind)}
                className="rounded-full border border-dashed border-foreground/25 px-4 py-2 text-sm font-semibold hover:border-primary hover:text-primary"
              >
                + {LANDING_BLOCK_KIND_LABELS[kind]}
              </button>
            ),
          )}
        </div>
      </div>

      {data.blocks.length === 0 && (
        <p className="rounded-2xl border border-dashed border-foreground/20 bg-muted/20 px-4 py-8 text-center text-sm text-foreground/55">
          No hay secciones. Agregá una para empezar.
        </p>
      )}

      <div className="space-y-3">
        {data.blocks.map((block, index) => {
          const open = activeId === block.id;
          return (
            <div
              key={block.id}
              className={`rounded-2xl border transition ${
                open
                  ? "border-primary/40 bg-primary/5"
                  : "border-foreground/10 bg-white"
              }`}
            >
              <div className="flex items-center gap-2 p-3">
                <div className="flex flex-col">
                  <button
                    type="button"
                    onClick={() => moveBlock(block.id, -1)}
                    disabled={index === 0}
                    aria-label="Subir"
                    className="rounded px-1 text-foreground/50 hover:text-primary disabled:opacity-25"
                  >
                    ▲
                  </button>
                  <button
                    type="button"
                    onClick={() => moveBlock(block.id, 1)}
                    disabled={index === data.blocks.length - 1}
                    aria-label="Bajar"
                    className="rounded px-1 text-foreground/50 hover:text-primary disabled:opacity-25"
                  >
                    ▼
                  </button>
                </div>

                <button
                  type="button"
                  onClick={() => setActiveId(open ? null : block.id)}
                  className="min-w-0 flex-1 text-left"
                >
                  <span className="flex items-center gap-2">
                    <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-foreground/55">
                      {LANDING_BLOCK_KIND_LABELS[block.kind]}
                    </span>
                    {!block.enabled && (
                      <span className="rounded-full bg-foreground/10 px-2 py-0.5 text-[10px] font-semibold text-foreground/50">
                        Oculto
                      </span>
                    )}
                  </span>
                  <span className="mt-1 block truncate text-sm font-bold">
                    {block.title || "Sin título"}
                  </span>
                  <span className="block text-xs text-foreground/50">
                    {placementLabel(block.placement)}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() =>
                    updateBlock(block.id, { enabled: !block.enabled })
                  }
                  className="shrink-0 rounded-full border border-foreground/15 px-3 py-1 text-xs font-semibold hover:border-primary hover:text-primary"
                >
                  {block.enabled ? "Ocultar" : "Mostrar"}
                </button>
                <button
                  type="button"
                  onClick={() => removeBlock(block.id)}
                  className="shrink-0 text-xs font-semibold text-red-600 hover:underline"
                >
                  Eliminar
                </button>
              </div>

              {open && (
                <div className="space-y-4 border-t border-foreground/10 p-4">
                  <div className="grid gap-3 sm:grid-cols-2">
                    <label className="block text-sm">
                      <span className="font-semibold">Ubicación</span>
                      <select
                        value={block.placement}
                        onChange={(e) =>
                          updateBlock(block.id, {
                            placement: e.target.value as LandingBlockPlacement,
                          })
                        }
                        className={inputClass}
                      >
                        {LANDING_BLOCK_PLACEMENTS.map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.label}
                          </option>
                        ))}
                      </select>
                    </label>

                    <label className="block text-sm">
                      <span className="font-semibold">Título</span>
                      <input
                        value={block.title}
                        onChange={(e) =>
                          updateBlock(block.id, { title: e.target.value })
                        }
                        className={inputClass}
                      />
                    </label>
                  </div>

                  {block.kind === "carousel" ? (
                    <CarouselFields
                      block={block}
                      onChange={(patch) => updateBlock(block.id, patch)}
                    />
                  ) : (
                    <BannerFields
                      block={block}
                      onChange={(patch) => updateBlock(block.id, patch)}
                    />
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {data.blocks.length > 0 && (
        <button
          type="button"
          disabled={isPending || !dirty}
          onClick={save}
          className="rounded-full bg-primary px-5 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-40"
        >
          {isPending ? "Guardando…" : "Guardar secciones"}
        </button>
      )}
    </div>
  );
}

function CarouselFields({
  block,
  onChange,
}: {
  block: CarouselBlock;
  onChange: (patch: Partial<CarouselBlock>) => void;
}) {
  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block text-sm">
          <span className="font-semibold">Tamaño de las fotos</span>
          <select
            value={block.size}
            onChange={(e) =>
              onChange({ size: e.target.value as CarouselSize })
            }
            className={inputClass}
          >
            {(Object.keys(CAROUSEL_SIZE_LABELS) as CarouselSize[]).map((s) => (
              <option key={s} value={s}>
                {CAROUSEL_SIZE_LABELS[s]}
              </option>
            ))}
          </select>
        </label>

        <label className="flex items-end gap-2 text-sm">
          <input
            type="checkbox"
            checked={block.reverse}
            onChange={(e) => onChange({ reverse: e.target.checked })}
            className="h-4 w-4 rounded border-foreground/20"
          />
          <span className="pb-2 font-semibold">Dirección inversa</span>
        </label>
      </div>

      <div className="space-y-3 border-t border-foreground/10 pt-4">
        <p className="text-xs font-semibold uppercase tracking-wide text-foreground/45">
          Fotos del carrusel
        </p>
        {block.items.map((item, i) => (
          <div
            key={i}
            className="flex gap-3 rounded-xl border border-foreground/10 p-3"
          >
            {item.src ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={item.src}
                alt={item.alt}
                className="h-16 w-16 shrink-0 rounded-lg object-cover"
              />
            ) : (
              <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-lg bg-muted text-xs text-foreground/40">
                Foto {i + 1}
              </div>
            )}
            <div className="min-w-0 flex-1 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold">Foto {i + 1}</span>
                {block.items.length > 1 && (
                  <button
                    type="button"
                    onClick={() => {
                      if (!confirm(`¿Eliminar la foto ${i + 1}?`)) return;
                      onChange({
                        items: block.items.filter((_, idx) => idx !== i),
                      });
                    }}
                    className="text-xs font-semibold text-red-600 hover:underline"
                  >
                    Eliminar
                  </button>
                )}
              </div>
              <ImageUploadField
                label=""
                value={item.src}
                onChange={(src) => {
                  const items = [...block.items];
                  items[i] = { ...item, src };
                  onChange({ items });
                }}
              />
              <input
                value={item.alt}
                placeholder="Descripción de la foto (accesibilidad)"
                onChange={(e) => {
                  const items = [...block.items];
                  items[i] = { ...item, alt: e.target.value };
                  onChange({ items });
                }}
                className={inputClass}
              />
              <input
                value={item.caption ?? ""}
                placeholder="Texto visible sobre la foto (opcional)"
                onChange={(e) => {
                  const items = [...block.items];
                  items[i] = { ...item, caption: e.target.value };
                  onChange({ items });
                }}
                className={inputClass}
              />
            </div>
          </div>
        ))}
        <button
          type="button"
          onClick={() =>
            onChange({
              items: [...block.items, { src: "", alt: "Nueva imagen" }],
            })
          }
          className="rounded-full border border-dashed border-foreground/25 px-4 py-2 text-sm font-semibold hover:border-primary hover:text-primary"
        >
          + Agregar foto
        </button>
      </div>
    </div>
  );
}

function BannerFields({
  block,
  onChange,
}: {
  block: BannerBlock;
  onChange: (patch: Partial<BannerBlock>) => void;
}) {
  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block text-sm">
          <span className="font-semibold">Diseño</span>
          <select
            value={block.layout}
            onChange={(e) =>
              onChange({ layout: e.target.value as BannerLayout })
            }
            className={inputClass}
          >
            {(Object.keys(BANNER_LAYOUT_LABELS) as BannerLayout[]).map((l) => (
              <option key={l} value={l}>
                {BANNER_LAYOUT_LABELS[l]}
              </option>
            ))}
          </select>
        </label>

        <label className="block text-sm">
          <span className="font-semibold">Antetítulo (opcional)</span>
          <input
            value={block.eyebrow}
            placeholder="Ej: Productos, Novedad"
            onChange={(e) => onChange({ eyebrow: e.target.value })}
            className={inputClass}
          />
        </label>
      </div>

      <label className="block text-sm">
        <span className="font-semibold">Texto</span>
        <textarea
          value={block.text}
          rows={3}
          onChange={(e) => onChange({ text: e.target.value })}
          className={`${inputClass} min-h-[88px] resize-y`}
        />
      </label>

      <ImageUploadField
        label="Imagen"
        value={block.imageSrc}
        onChange={(src) => onChange({ imageSrc: src })}
      />
      <input
        value={block.imageAlt}
        placeholder="Descripción de la imagen (accesibilidad)"
        onChange={(e) => onChange({ imageAlt: e.target.value })}
        className={inputClass}
      />

      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block text-sm">
          <span className="font-semibold">Texto del botón (opcional)</span>
          <input
            value={block.ctaLabel}
            placeholder="Ej: Ver más, Comprar"
            onChange={(e) => onChange({ ctaLabel: e.target.value })}
            className={inputClass}
          />
        </label>
        <label className="block text-sm">
          <span className="font-semibold">Enlace del botón</span>
          <input
            value={block.ctaHref}
            placeholder="/productos o https://wa.me/..."
            onChange={(e) => onChange({ ctaHref: e.target.value })}
            className={inputClass}
          />
        </label>
      </div>
    </div>
  );
}
