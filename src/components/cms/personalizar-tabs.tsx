"use client";

import Link from "next/link";
import { useState } from "react";
import { ConsultationPricesEditor } from "@/components/cms/consultation-prices-editor";
import { FormTemplateEditor } from "@/components/cms/form-template-editor";
import { LandingImagesEditor } from "@/components/cms/landing-images-editor";
import { NutricionistaCvEditor } from "@/components/cms/nutricionista-cv-editor";
import { PaymentChatPolicyEditor } from "@/components/cms/payment-chat-policy-editor";
import { SiteContentEditor } from "@/components/cms/site-content-editor";
import type {
  ConsultationAdminDTO,
  FormTemplateDTO,
  SiteContentDTO,
} from "@/server/actions/cms.actions";
import type { PaymentChatPolicy } from "@/types/payment-chat-policy";
import type { LandingImagesData } from "@/types/landing-images";
import { LANDING_IMAGES_SLUG } from "@/types/landing-images";
import type { NutricionistaPageData } from "@/types/nutricionista-cv";
import { NUTRICIONISTA_PAGE_SLUG } from "@/types/nutricionista-cv";

const tabs = [
  {
    id: "imagenes",
    label: "Imágenes",
    hint: "Hero, galería, paquetes y secciones visuales de la landing.",
  },
  {
    id: "precios",
    label: "Precios y pagos",
    hint: "Servicios, montos, adelantos y reglas del chat.",
  },
  {
    id: "web",
    label: "Textos web",
    hint: "Títulos y párrafos editables del sitio público.",
  },
  {
    id: "conocerme",
    label: "Conóceme más",
    hint: "CV y perfil profesional de la nutricionista.",
  },
  {
    id: "formularios",
    label: "Formularios",
    hint: "Preguntas que completan los pacientes antes de cada cita.",
  },
  {
    id: "recursos",
    label: "Recursos",
    hint: "E-books, videos y material descargable.",
  },
] as const;

type TabId = (typeof tabs)[number]["id"];

export function PersonalizarTabs({
  consultationTypes,
  siteBlocks,
  formTemplates,
  resourceCount,
  landingImages,
  nutricionistaPage,
  paymentPolicy,
}: {
  consultationTypes: ConsultationAdminDTO[];
  siteBlocks: SiteContentDTO[];
  formTemplates: FormTemplateDTO[];
  resourceCount: number;
  landingImages: LandingImagesData;
  nutricionistaPage: NutricionistaPageData;
  paymentPolicy: PaymentChatPolicy;
}) {
  const [tab, setTab] = useState<TabId>("imagenes");
  const textBlocks = siteBlocks.filter(
    (b) => b.slug !== LANDING_IMAGES_SLUG && b.slug !== NUTRICIONISTA_PAGE_SLUG,
  );
  const activeTab = tabs.find((t) => t.id === tab)!;

  return (
    <div className="grid gap-6 lg:grid-cols-[220px_minmax(0,1fr)] lg:items-start">
      <nav className="flex gap-2 overflow-x-auto pb-1 lg:sticky lg:top-4 lg:flex-col lg:overflow-x-visible lg:pb-0">
        {tabs.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={`shrink-0 rounded-xl px-4 py-3 text-left text-sm font-semibold transition lg:w-full ${
              tab === t.id
                ? "bg-primary text-primary-foreground shadow-sm"
                : "bg-white text-foreground/70 ring-1 ring-foreground/10 hover:bg-muted/50"
            }`}
          >
            {t.label}
          </button>
        ))}
      </nav>

      <div className="min-w-0">
        <header className="mb-5 rounded-2xl border border-foreground/8 bg-white px-5 py-4">
          <h2 className="text-lg font-bold text-primary">{activeTab.label}</h2>
          <p className="mt-1 text-sm text-foreground/60">{activeTab.hint}</p>
        </header>

        {tab === "imagenes" && (
          <LandingImagesEditor initial={landingImages} />
        )}

        {tab === "precios" && (
          <div className="space-y-6">
            <PaymentChatPolicyEditor initial={paymentPolicy} />
            <ConsultationPricesEditor types={consultationTypes} />
          </div>
        )}

        {tab === "web" && <SiteContentEditor blocks={textBlocks} />}

        {tab === "conocerme" && (
          <NutricionistaCvEditor initial={nutricionistaPage} />
        )}

        {tab === "formularios" && (
          <FormTemplateEditor templates={formTemplates} />
        )}

        {tab === "recursos" && (
          <div className="rounded-2xl border border-foreground/10 bg-white p-6">
            <h3 className="text-lg font-bold">Biblioteca digital</h3>
            <p className="mt-2 text-sm text-foreground/60">
              Subí portadas, archivos y enlaces desde el módulo de recursos. Los
              pacientes los ven en su biblioteca.
            </p>
            <p className="mt-3 text-sm">
              <strong>{resourceCount}</strong> recurso(s) publicados.
            </p>
            <Link
              href="/dashboard/admin/resources"
              className="mt-5 inline-block rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground"
            >
              Gestionar recursos →
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
