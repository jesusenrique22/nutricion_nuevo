"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { IconUploadField } from "@/components/cms/icon-upload-field";
import { authBrandingToRecord } from "@/lib/auth-branding-parse";
import { updateSiteContent } from "@/server/actions/cms.actions";
import { AUTH_BRANDING_SLUG, type AuthBrandingData } from "@/types/auth-branding";

const inputClass =
  "mt-1 w-full rounded-xl border border-foreground/15 px-3 py-2 text-sm outline-none focus:border-primary";

export function AuthBrandingEditor({
  initial,
  onLiveChange,
}: {
  initial: AuthBrandingData;
  onLiveChange?: (data: AuthBrandingData) => void;
}) {
  const router = useRouter();
  const [data, setData] = useState(initial);
  const [message, setMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    setData(initial);
  }, [initial]);

  function update(next: AuthBrandingData) {
    setData(next);
    onLiveChange?.(next);
  }

  function save() {
    setMessage(null);
    startTransition(async () => {
      const res = await updateSiteContent({
        slug: AUTH_BRANDING_SLUG,
        title: "Branding del login",
        data: authBrandingToRecord(data),
      });
      setMessage(res.ok ? "Login actualizado." : res.message);
      if (res.ok) router.refresh();
    });
  }

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-primary/15 bg-primary/5 px-4 py-3 text-sm text-foreground/75">
        Esto se ve al tocar <strong>Iniciar sesión</strong> (pantalla de acceso),
        no en la página Sobre mí.
      </div>

      <div className="rounded-2xl border border-foreground/10 bg-white p-4 space-y-4">
        <IconUploadField
          label="Foto en el login"
          value={data.photoUrl}
          onChange={(photoUrl) => update({ ...data, photoUrl })}
          folder="auth"
          objectFit="cover"
          hint="Retrato / avatar junto al nombre en la pantalla de ingreso (formato cuadrado)."
        />
        <label className="block text-sm">
          <span className="font-semibold">Nombre</span>
          <input
            className={inputClass}
            value={data.name}
            onChange={(e) => update({ ...data, name: e.target.value })}
            placeholder="Lic. María Antonieta Lanza"
          />
        </label>
        <label className="block text-sm">
          <span className="font-semibold">Línea bajo el nombre</span>
          <input
            className={inputClass}
            value={data.role}
            onChange={(e) => update({ ...data, role: e.target.value })}
            placeholder="Nutrición · Fitness · Wellness"
          />
        </label>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          disabled={isPending}
          onClick={save}
          className="rounded-full bg-primary px-5 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-50"
        >
          {isPending ? "Guardando…" : "Guardar login"}
        </button>
        {message ? (
          <p className="text-sm text-foreground/70">{message}</p>
        ) : null}
      </div>
    </div>
  );
}
