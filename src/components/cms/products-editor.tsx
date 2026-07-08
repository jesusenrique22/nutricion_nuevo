"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ProductImagesUploadField } from "@/components/cms/product-images-upload-field";
import { DecimalInput } from "@/components/ui/decimal-input";
import { CurrencyFieldSelect } from "@/components/currency/currency-field-select";
import { productsToRecord } from "@/lib/products-parse";
import { updateSiteContent } from "@/server/actions/cms.actions";
import { PRODUCTS_SLUG } from "@/types/products";
import type { ProductItem, ProductsData } from "@/types/products";

const inputClass =
  "mt-1 w-full rounded-xl border border-foreground/15 px-3 py-2 text-sm outline-none focus:border-primary";

function newId(prefix: string): string {
  return `${prefix}-${Date.now().toString(36)}-${Math.floor(
    Math.random() * 1000,
  )}`;
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

function ProductRow({
  item,
  index,
  total,
  categories,
  onChange,
  onMove,
  onRemove,
  open,
  onToggle,
}: {
  item: ProductItem;
  index: number;
  total: number;
  categories: ProductsData["categories"];
  onChange: (patch: Partial<ProductItem>) => void;
  onMove: (direction: -1 | 1) => void;
  onRemove: () => void;
  open: boolean;
  onToggle: () => void;
}) {
  return (
    <div
      className={`rounded-2xl border transition ${
        open ? "border-primary/40 bg-primary/5" : "border-foreground/10 bg-white"
      }`}
    >
      <div className="flex items-center gap-2 p-3">
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

        <button
          type="button"
          onClick={onToggle}
          className="min-w-0 flex-1 text-left"
        >
          <span className="flex items-center gap-2">
            {!item.enabled && (
              <span className="rounded-full bg-foreground/10 px-2 py-0.5 text-[10px] font-semibold text-foreground/50">
                Oculto
              </span>
            )}
            {item.price > 0 && (
              <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-bold text-primary">
                {item.currency === "USD" ? "USD " : "$"}
                {item.price}
              </span>
            )}
          </span>
          <span className="mt-1 block truncate text-sm font-bold">
            {item.name || "Sin nombre"}
          </span>
        </button>

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

      {open && (
        <div className="space-y-4 border-t border-foreground/10 p-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block text-sm">
              <span className="font-semibold">Nombre</span>
              <input
                value={item.name}
                onChange={(e) => onChange({ name: e.target.value })}
                className={inputClass}
              />
            </label>
            <label className="block text-sm">
              <span className="font-semibold">Precio</span>
              <DecimalInput
                value={item.price}
                onChange={(price) => onChange({ price })}
                className={inputClass}
                placeholder="Ej: 35000 o 35,50"
              />
            </label>
            <label className="block text-sm">
              <span className="font-semibold">Moneda</span>
              <CurrencyFieldSelect
                value={item.currency}
                onChange={(currency) => onChange({ currency })}
                className={inputClass}
              />
            </label>
          </div>

          <label className="block text-sm">
            <span className="font-semibold">Descripción corta</span>
            <span className="mt-0.5 block text-xs font-normal text-foreground/50">
              Aparece en la tarjeta del catálogo (2 líneas).
            </span>
            <textarea
              value={item.description}
              rows={2}
              onChange={(e) => onChange({ description: e.target.value })}
              className={inputClass}
            />
          </label>

          <label className="block text-sm">
            <span className="font-semibold">Descripción completa</span>
            <span className="mt-0.5 block text-xs font-normal text-foreground/50">
              Se muestra al abrir el detalle del producto (estilo Amazon).
            </span>
            <textarea
              value={item.detailDescription}
              rows={5}
              onChange={(e) => onChange({ detailDescription: e.target.value })}
              className={inputClass}
              placeholder="Ingredientes, modo de uso, beneficios, presentación…"
            />
          </label>

          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block text-sm">
              <span className="font-semibold">Categoría</span>
              <select
                value={item.categoryId}
                onChange={(e) => onChange({ categoryId: e.target.value })}
                className={inputClass}
              >
                <option value="">Sin categoría</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.label}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <ProductImagesUploadField
            label="Fotos del producto"
            images={item.images}
            productName={item.name}
            onChange={(images) => onChange({ images })}
          />
          <p className="text-xs text-foreground/50">
            El paciente verá un botón <strong>Comprar</strong> que agrega este
            producto al carrito, igual que los recursos.
          </p>
        </div>
      )}
    </div>
  );
}

export function ProductsEditor({
  initial,
  onLiveChange,
}: {
  initial: ProductsData;
  onLiveChange?: (data: ProductsData) => void;
}) {
  const router = useRouter();
  const [data, setData] = useState(initial);
  const [activeId, setActiveId] = useState<string | null>(
    initial.items[0]?.id ?? null,
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

  function update(next: ProductsData) {
    setData(next);
    setDirty(true);
    setMessage(null);
    onLiveChange?.(next);
  }

  function updateItem(id: string, patch: Partial<ProductItem>) {
    update({
      ...data,
      items: data.items.map((it) => (it.id === id ? { ...it, ...patch } : it)),
    });
  }

  function addItem() {
    const item: ProductItem = {
      id: newId("prod"),
      name: "Nuevo producto",
      description: "",
      detailDescription: "",
      price: 0,
      currency: "ARS",
      images: [],
      categoryId: data.categories[0]?.id ?? "",
      enabled: true,
    };
    update({ ...data, items: [...data.items, item] });
    setActiveId(item.id);
  }

  function removeItem(id: string) {
    update({ ...data, items: data.items.filter((it) => it.id !== id) });
    if (activeId === id) setActiveId(null);
  }

  function moveItem(id: string, direction: -1 | 1) {
    const index = data.items.findIndex((it) => it.id === id);
    const target = index + direction;
    if (index < 0 || target < 0 || target >= data.items.length) return;
    const items = [...data.items];
    [items[index], items[target]] = [items[target], items[index]];
    update({ ...data, items });
  }

  function addCategory() {
    const cat = { id: newId("cat"), label: "Nueva categoría" };
    update({ ...data, categories: [...data.categories, cat] });
  }

  function updateCategory(id: string, label: string) {
    update({
      ...data,
      categories: data.categories.map((c) =>
        c.id === id ? { ...c, label } : c,
      ),
    });
  }

  function removeCategory(id: string) {
    update({
      ...data,
      categories: data.categories.filter((c) => c.id !== id),
      // Los productos que usaban esta categoría quedan "Sin categoría".
      items: data.items.map((it) =>
        it.categoryId === id ? { ...it, categoryId: "" } : it,
      ),
    });
  }

  function save() {
    setMessage(null);
    startTransition(async () => {
      const res = await updateSiteContent({
        slug: PRODUCTS_SLUG,
        title: "Productos",
        data: productsToRecord(data),
      });
      setMessage(res.ok ? "Productos guardados." : res.message);
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

      {/* Ajustes generales */}
      <div className="space-y-3 rounded-2xl border border-foreground/10 bg-white p-4">
        <p className="text-sm font-semibold">Página de productos</p>
        <p className="text-xs text-foreground/55">
          Los pacientes compran desde el carrito, igual que los recursos. El
          pago se revisa en Pagos del panel.
        </p>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="block text-sm">
            <span className="font-semibold">Título</span>
            <input
              value={data.heading}
              onChange={(e) => update({ ...data, heading: e.target.value })}
              className={inputClass}
            />
          </label>
        </div>
        <label className="block text-sm">
          <span className="font-semibold">Subtítulo</span>
          <input
            value={data.subheading}
            onChange={(e) => update({ ...data, subheading: e.target.value })}
            className={inputClass}
          />
        </label>
      </div>

      {/* Categorías */}
      <div className="space-y-3 rounded-2xl border border-foreground/10 bg-white p-4">
        <p className="text-sm font-semibold">Categorías</p>
        <p className="text-xs text-foreground/55">
          Sirven para que el visitante filtre los productos. Cada producto puede
          pertenecer a una.
        </p>
        <div className="space-y-2">
          {data.categories.map((c) => (
            <div key={c.id} className="flex items-center gap-2">
              <input
                value={c.label}
                onChange={(e) => updateCategory(c.id, e.target.value)}
                className="min-w-0 flex-1 rounded-xl border border-foreground/15 px-3 py-2 text-sm outline-none focus:border-primary"
              />
              <button
                type="button"
                onClick={() => removeCategory(c.id)}
                className="shrink-0 text-xs font-semibold text-red-600 hover:underline"
              >
                Quitar
              </button>
            </div>
          ))}
        </div>
        <button
          type="button"
          onClick={addCategory}
          className="rounded-full border border-dashed border-foreground/25 px-4 py-2 text-sm font-semibold hover:border-primary hover:text-primary"
        >
          + Agregar categoría
        </button>
      </div>

      {/* Productos */}
      <div className="space-y-3">
        <p className="px-1 text-sm font-semibold">Productos</p>
        {data.items.length === 0 && (
          <p className="rounded-2xl border border-dashed border-foreground/20 bg-muted/20 px-4 py-8 text-center text-sm text-foreground/55">
            No hay productos. Agregá uno para empezar.
          </p>
        )}
        {data.items.map((item, index) => (
          <ProductRow
            key={item.id}
            item={item}
            index={index}
            total={data.items.length}
            categories={data.categories}
            open={activeId === item.id}
            onToggle={() => setActiveId(activeId === item.id ? null : item.id)}
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
        + Agregar producto
      </button>
    </div>
  );
}
