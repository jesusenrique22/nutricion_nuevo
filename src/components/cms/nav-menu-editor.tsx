"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { navMenuToRecord } from "@/lib/nav-menu-parse";
import { updateSiteContent } from "@/server/actions/cms.actions";
import type { NavItemType, NavMenuData, NavMenuItem } from "@/types/nav-menu";
import {
  NAV_ITEM_TYPE_LABELS,
  NAV_MENU_SLUG,
  NAV_PAGE_OPTIONS,
  NAV_SECTION_OPTIONS,
} from "@/types/nav-menu";

const inputClass =
  "mt-1 w-full rounded-xl border border-foreground/15 px-3 py-2 text-sm outline-none focus:border-primary";

function newId(): string {
  return `nav-${Date.now().toString(36)}-${Math.floor(Math.random() * 1000)}`;
}

function defaultTargetFor(type: NavItemType): string {
  if (type === "section") return NAV_SECTION_OPTIONS[0]?.id ?? "inicio";
  if (type === "page") return NAV_PAGE_OPTIONS[0]?.id ?? "/nutricionista";
  return "https://";
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

function ItemRow({
  item,
  index,
  total,
  onChange,
  onMove,
  onRemove,
}: {
  item: NavMenuItem;
  index: number;
  total: number;
  onChange: (patch: Partial<NavMenuItem>) => void;
  onMove: (direction: -1 | 1) => void;
  onRemove: () => void;
}) {
  return (
    <div
      className={`rounded-2xl border p-3 transition ${
        item.enabled
          ? "border-foreground/10 bg-white"
          : "border-dashed border-foreground/15 bg-muted/20"
      }`}
    >
      <div className="flex items-center gap-2">
        <div className="flex flex-col">
          <button
            type="button"
            onClick={() => onMove(-1)}
            disabled={index === 0}
            aria-label="Subir"
            className="rounded px-1 text-foreground/50 hover:text-primary disabled:opacity-25"
          >
            ▲
          </button>
          <button
            type="button"
            onClick={() => onMove(1)}
            disabled={index === total - 1}
            aria-label="Bajar"
            className="rounded px-1 text-foreground/50 hover:text-primary disabled:opacity-25"
          >
            ▼
          </button>
        </div>

        <input
          value={item.label}
          placeholder="Nombre del menú"
          onChange={(e) => onChange({ label: e.target.value })}
          className="min-w-0 flex-1 rounded-xl border border-foreground/15 px-3 py-2 text-sm font-semibold outline-none focus:border-primary"
        />

        <button
          type="button"
          onClick={() => onChange({ enabled: !item.enabled })}
          className="shrink-0 rounded-full border border-foreground/15 px-3 py-1 text-xs font-semibold hover:border-primary hover:text-primary"
        >
          {item.enabled ? "Ocultar" : "Mostrar"}
        </button>
        <button
          type="button"
          onClick={onRemove}
          className="shrink-0 text-xs font-semibold text-red-600 hover:underline"
        >
          Eliminar
        </button>
      </div>

      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        <label className="block text-sm">
          <span className="font-semibold">¿A dónde lleva?</span>
          <select
            value={item.type}
            onChange={(e) => {
              const type = e.target.value as NavItemType;
              onChange({ type, target: defaultTargetFor(type) });
            }}
            className={inputClass}
          >
            {(Object.keys(NAV_ITEM_TYPE_LABELS) as NavItemType[]).map((t) => (
              <option key={t} value={t}>
                {NAV_ITEM_TYPE_LABELS[t]}
              </option>
            ))}
          </select>
        </label>

        <label className="block text-sm">
          <span className="font-semibold">Destino</span>
          {item.type === "section" && (
            <select
              value={item.target}
              onChange={(e) => onChange({ target: e.target.value })}
              className={inputClass}
            >
              {NAV_SECTION_OPTIONS.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.label}
                </option>
              ))}
            </select>
          )}
          {item.type === "page" && (
            <select
              value={item.target}
              onChange={(e) => onChange({ target: e.target.value })}
              className={inputClass}
            >
              {NAV_PAGE_OPTIONS.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.label}
                </option>
              ))}
            </select>
          )}
          {item.type === "external" && (
            <input
              value={item.target}
              placeholder="https://tusitio.com"
              onChange={(e) => onChange({ target: e.target.value })}
              className={inputClass}
            />
          )}
        </label>
      </div>
    </div>
  );
}

export function NavMenuEditor({
  initial,
  onLiveChange,
}: {
  initial: NavMenuData;
  onLiveChange?: (data: NavMenuData) => void;
}) {
  const router = useRouter();
  const [data, setData] = useState(initial);
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

  function update(next: NavMenuData) {
    setData(next);
    setDirty(true);
    setMessage(null);
    onLiveChange?.(next);
  }

  function updateItem(id: string, patch: Partial<NavMenuItem>) {
    update({
      items: data.items.map((it) => (it.id === id ? { ...it, ...patch } : it)),
    });
  }

  function addItem() {
    const item: NavMenuItem = {
      id: newId(),
      label: "Nueva opción",
      type: "page",
      target: defaultTargetFor("page"),
      enabled: true,
    };
    update({ items: [...data.items, item] });
  }

  function removeItem(id: string) {
    update({ items: data.items.filter((it) => it.id !== id) });
  }

  function moveItem(id: string, direction: -1 | 1) {
    const index = data.items.findIndex((it) => it.id === id);
    const target = index + direction;
    if (index < 0 || target < 0 || target >= data.items.length) return;
    const items = [...data.items];
    [items[index], items[target]] = [items[target], items[index]];
    update({ items });
  }

  function save() {
    setMessage(null);
    startTransition(async () => {
      const res = await updateSiteContent({
        slug: NAV_MENU_SLUG,
        title: "Menú del lobby",
        data: navMenuToRecord(data),
      });
      setMessage(res.ok ? "Menú guardado." : res.message);
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
        <p className="text-sm font-semibold">Menú de navegación del inicio</p>
        <p className="mt-0.5 text-xs text-foreground/55">
          Estas son las opciones que ve el visitante arriba del sitio. Podés
          renombrarlas, reordenarlas, ocultarlas o crear nuevas que lleven a una
          sección, a una página (como Productos) o a un enlace externo.
        </p>
      </div>

      {data.items.length === 0 && (
        <p className="rounded-2xl border border-dashed border-foreground/20 bg-muted/20 px-4 py-8 text-center text-sm text-foreground/55">
          No hay opciones en el menú. Agregá una para empezar.
        </p>
      )}

      <div className="space-y-3">
        {data.items.map((item, index) => (
          <ItemRow
            key={item.id}
            item={item}
            index={index}
            total={data.items.length}
            onChange={(patch) => updateItem(item.id, patch)}
            onMove={(direction) => moveItem(item.id, direction)}
            onRemove={() => removeItem(item.id)}
          />
        ))}
      </div>

      <button
        type="button"
        onClick={addItem}
        className="rounded-full border border-dashed border-foreground/25 px-4 py-2 text-sm font-semibold hover:border-primary hover:text-primary"
      >
        + Agregar opción al menú
      </button>
    </div>
  );
}
