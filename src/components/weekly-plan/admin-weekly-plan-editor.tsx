"use client";

import Image from "next/image";
import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { upsertWeeklyPlan } from "@/server/actions/weekly-plan.actions";
import {
  DEFAULT_WEEKLY_DAYS,
  type WeeklyDayPlan,
  type WeeklyMeal,
  type WeeklyPlanData,
} from "@/types/weekly-plan";
import { isDisplayableCoverUrl } from "@/lib/resource-cover";

const inputClass =
  "mt-1 w-full rounded-xl border border-foreground/15 px-3 py-2 text-sm outline-none focus:border-primary";

export function AdminWeeklyPlanEditor({
  patientId,
  patientName,
  initial,
}: {
  patientId: string;
  patientName: string;
  initial: WeeklyPlanData | null;
}) {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [title, setTitle] = useState(initial?.title ?? "Plan semanal");
  const [weekLabel, setWeekLabel] = useState(initial?.weekLabel ?? "");
  const [imageUrl, setImageUrl] = useState(initial?.imageUrl ?? "");
  const [notes, setNotes] = useState(initial?.notes ?? "");
  const [isPublished, setIsPublished] = useState(initial?.isPublished ?? false);
  const [days, setDays] = useState<WeeklyDayPlan[]>(
    initial?.days?.length ? initial.days : DEFAULT_WEEKLY_DAYS,
  );
  const [message, setMessage] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [isPending, startTransition] = useTransition();

  async function uploadImage(file: File) {
    setUploading(true);
    setMessage(null);
    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("folder", "weekly-plans");
      const res = await fetch("/api/resources/upload", {
        method: "POST",
        body: fd,
      });
      const json = (await res.json()) as { url?: string; error?: string };
      if (!res.ok || !json.url) throw new Error(json.error ?? "Error al subir");
      setImageUrl(json.url);
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Error al subir");
    } finally {
      setUploading(false);
    }
  }

  function updateMeal(
    dayIndex: number,
    mealIndex: number,
    patch: Partial<WeeklyMeal>,
  ) {
    setDays(
      days.map((d, di) =>
        di !== dayIndex
          ? d
          : {
              ...d,
              meals: d.meals.map((m, mi) =>
                mi !== mealIndex ? m : { ...m, ...patch },
              ),
            },
      ),
    );
  }

  function addMeal(dayIndex: number) {
    setDays(
      days.map((d, di) =>
        di !== dayIndex
          ? d
          : {
              ...d,
              meals: [
                ...d.meals,
                { time: "12:00", title: "Comida", description: "" },
              ],
            },
      ),
    );
  }

  function removeMeal(dayIndex: number, mealIndex: number) {
    setDays(
      days.map((d, di) =>
        di !== dayIndex
          ? d
          : {
              ...d,
              meals: d.meals.filter((_, mi) => mi !== mealIndex),
            },
      ),
    );
  }

  function save() {
    setMessage(null);
    startTransition(async () => {
      const res = await upsertWeeklyPlan({
        patientId,
        planId: initial?.id,
        title,
        weekLabel: weekLabel || undefined,
        imageUrl: imageUrl || undefined,
        notes: notes || undefined,
        isPublished,
        days,
      });
      setMessage(res.ok ? "Plan guardado." : res.message);
      if (res.ok) router.refresh();
    });
  }

  return (
    <div className="mt-4 space-y-4">
      <p className="text-sm text-foreground/60">
        Crea o edita el plan semanal de <strong>{patientName}</strong>. Al
        publicarlo, el paciente lo verá en su librería.
      </p>

      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block text-sm">
          <span className="font-semibold">Título</span>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className={inputClass}
          />
        </label>
        <label className="block text-sm">
          <span className="font-semibold">Etiqueta de semana</span>
          <input
            value={weekLabel}
            onChange={(e) => setWeekLabel(e.target.value)}
            placeholder="Ej. Semana del 10 al 16 de junio"
            className={inputClass}
          />
        </label>
      </div>

      <label className="block text-sm">
        <span className="font-semibold">Notas generales</span>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          className={`${inputClass} min-h-[80px]`}
        />
      </label>

      <div className="rounded-xl border border-foreground/10 p-3">
        <span className="text-sm font-semibold">Imagen del plan (opcional)</span>
        {isDisplayableCoverUrl(imageUrl) && (
          <div className="relative mt-2 aspect-video max-w-sm overflow-hidden rounded-lg bg-muted">
            <Image
              src={imageUrl}
              alt=""
              fill
              className="object-cover"
              sizes="320px"
              unoptimized={imageUrl.startsWith("/uploads/")}
            />
          </div>
        )}
        <div className="mt-2 flex flex-wrap gap-2">
          <button
            type="button"
            disabled={uploading}
            onClick={() => fileRef.current?.click()}
            className="rounded-full bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground"
          >
            {uploading ? "Subiendo…" : "Subir imagen"}
          </button>
          {imageUrl && (
            <button
              type="button"
              onClick={() => setImageUrl("")}
              className="rounded-full border px-3 py-1.5 text-xs font-semibold"
            >
              Quitar
            </button>
          )}
        </div>
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) void uploadImage(file);
            e.target.value = "";
          }}
        />
      </div>

      <div className="space-y-4">
        {days.map((dayPlan, dayIndex) => (
          <div
            key={dayPlan.day}
            className="rounded-xl border border-foreground/10 bg-muted/20 p-4"
          >
            <h4 className="font-bold text-primary">{dayPlan.day}</h4>
            <div className="mt-3 space-y-3">
              {dayPlan.meals.map((meal, mealIndex) => (
                <div
                  key={mealIndex}
                  className="grid gap-2 rounded-lg bg-white p-3 sm:grid-cols-4"
                >
                  <input
                    value={meal.time ?? ""}
                    onChange={(e) =>
                      updateMeal(dayIndex, mealIndex, { time: e.target.value })
                    }
                    placeholder="Hora"
                    className={inputClass}
                  />
                  <input
                    value={meal.title}
                    onChange={(e) =>
                      updateMeal(dayIndex, mealIndex, { title: e.target.value })
                    }
                    placeholder="Comida"
                    className={inputClass}
                  />
                  <input
                    value={meal.description ?? ""}
                    onChange={(e) =>
                      updateMeal(dayIndex, mealIndex, {
                        description: e.target.value,
                      })
                    }
                    placeholder="Descripción / menú"
                    className={`${inputClass} sm:col-span-2`}
                  />
                  <button
                    type="button"
                    onClick={() => removeMeal(dayIndex, mealIndex)}
                    className="text-xs font-semibold text-red-600 sm:col-span-4 sm:text-left"
                  >
                    Quitar comida
                  </button>
                </div>
              ))}
            </div>
            <button
              type="button"
              onClick={() => addMeal(dayIndex)}
              className="mt-2 text-xs font-semibold text-primary"
            >
              + Agregar comida
            </button>
          </div>
        ))}
      </div>

      <label className="flex items-center gap-2 text-sm font-semibold">
        <input
          type="checkbox"
          checked={isPublished}
          onChange={(e) => setIsPublished(e.target.checked)}
        />
        Publicar plan (visible para el paciente)
      </label>

      <button
        type="button"
        disabled={isPending}
        onClick={save}
        className="rounded-full bg-primary px-5 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-50"
      >
        {isPending ? "Guardando…" : "Guardar plan semanal"}
      </button>
      {message && <p className="text-sm">{message}</p>}
    </div>
  );
}
