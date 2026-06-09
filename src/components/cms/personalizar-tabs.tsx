"use client";

import Link from "next/link";
import { useState } from "react";
import { ConsultationPricesEditor } from "@/components/cms/consultation-prices-editor";
import { FormTemplateEditor } from "@/components/cms/form-template-editor";
import { LandingImagesEditor } from "@/components/cms/landing-images-editor";
import { SiteContentEditor } from "@/components/cms/site-content-editor";
import type {
  ConsultationAdminDTO,
  FormTemplateDTO,
  SiteContentDTO,
} from "@/server/actions/cms.actions";
import type { LandingImagesData } from "@/types/landing-images";
import { LANDING_IMAGES_SLUG } from "@/types/landing-images";

const tabs = [
  { id: "imagenes", label: "Imágenes" },
  { id: "precios", label: "Precios y consultas" },
  { id: "web", label: "Contenido web" },
  { id: "formularios", label: "Formularios" },
  { id: "recursos", label: "Recursos" },
] as const;

type TabId = (typeof tabs)[number]["id"];

export function PersonalizarTabs({
  consultationTypes,
  siteBlocks,
  formTemplates,
  resourceCount,
  landingImages,
}: {
  consultationTypes: ConsultationAdminDTO[];
  siteBlocks: SiteContentDTO[];
  formTemplates: FormTemplateDTO[];
  resourceCount: number;
  landingImages: LandingImagesData;
}) {
  const [tab, setTab] = useState<TabId>("imagenes");
  const textBlocks = siteBlocks.filter((b) => b.slug !== LANDING_IMAGES_SLUG);

  return (
    <div>
      <div className="flex flex-wrap gap-2 border-b border-foreground/10 pb-4">
        {tabs.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
              tab === t.id
                ? "bg-primary text-primary-foreground"
                : "bg-muted hover:bg-muted/80"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="mt-6">
        {tab === "imagenes" && (
          <LandingImagesEditor initial={landingImages} />
        )}
        {tab === "precios" && (
          <ConsultationPricesEditor types={consultationTypes} />
        )}
        {tab === "web" && <SiteContentEditor blocks={textBlocks} />}
        {tab === "formularios" && (
          <FormTemplateEditor templates={formTemplates} />
        )}
        {tab === "recursos" && (
          <div className="rounded-2xl border border-foreground/10 bg-white p-6">
            <p className="text-sm text-foreground/60">
              Gestiona e-books, videos, portadas y enlaces desde el módulo de
              recursos.
            </p>
            <p className="mt-2 text-sm">
              <strong>{resourceCount}</strong> recurso(s) en catálogo.
            </p>
            <Link
              href="/dashboard/admin/resources"
              className="mt-4 inline-block rounded-full bg-primary px-5 py-2 text-sm font-semibold text-primary-foreground"
            >
              Ir a recursos →
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
