"use client";

import Link from "next/link";
import { useState } from "react";
import { PaymentCheckoutPolicyEditor } from "@/components/cms/payment-checkout-policy-editor";
import { LandingImagesEditor } from "@/components/cms/landing-images-editor";
import { NutricionistaCvEditor } from "@/components/cms/nutricionista-cv-editor";
import { SiteContentEditor } from "@/components/cms/site-content-editor";
import { PageSectionPreview } from "@/components/cms/page-section-preview";
import type { SiteContentDTO } from "@/server/actions/cms.actions";
import { CURRENCY_POLICY_SLUG } from "@/types/currency-policy";
import type { LandingImagesData } from "@/types/landing-images";
import { LANDING_IMAGES_SLUG } from "@/types/landing-images";
import type { NutricionistaPageData } from "@/types/nutricionista-cv";
import { NUTRICIONISTA_PAGE_SLUG } from "@/types/nutricionista-cv";
import { PAYMENT_CHECKOUT_POLICY_SLUG } from "@/types/payment-checkout-policy";
import type { PaymentCheckoutPolicy } from "@/types/payment-checkout-policy";
import { PAYMENT_CHAT_POLICY_SLUG } from "@/types/payment-chat-policy";

const tabs = [
  {
    id: "imagenes",
    label: "Imágenes",
    description: "Portada, galería, paquetes y servicios",
    affects: "Página de inicio",
  },
  {
    id: "web",
    label: "Textos",
    description: "Títulos, subtítulos y párrafos",
    affects: "Textos de la landing",
  },
  {
    id: "conocerme",
    label: "Sobre mí",
    description: "Presentación, foto y CV",
    affects: "/nutricionista",
  },
  {
    id: "pagos",
    label: "Métodos de pago",
    description: "Contacto y métodos del carrito",
    affects: "Carrito del paciente",
  },
  {
    id: "recursos",
    label: "Recursos",
    description: "E-books, videos y PDFs",
    affects: "/resources",
  },
] as const;

type TabId = (typeof tabs)[number]["id"];

export function PersonalizarTabs({
  siteBlocks,
  resourceCount,
  landingImages,
  nutricionistaPage,
  paymentCheckoutPolicy,
}: {
  siteBlocks: SiteContentDTO[];
  resourceCount: number;
  landingImages: LandingImagesData;
  nutricionistaPage: NutricionistaPageData;
  paymentCheckoutPolicy: PaymentCheckoutPolicy;
}) {
  const [tab, setTab] = useState<TabId>("imagenes");

  // ── Estado en vivo para cada sección (se actualiza sin guardar) ──
  const [liveImages, setLiveImages] = useState(landingImages);
  const [liveTextBlocks, setLiveTextBlocks] = useState(siteBlocks);
  const [liveNutricionista, setLiveNutricionista] = useState(nutricionistaPage);
  const [livePaymentPolicy, setLivePaymentPolicy] = useState(paymentCheckoutPolicy);
  const [liveImageSection, setLiveImageSection] = useState<
    "hero" | "gallery" | "plans" | "services" | "other"
  >("hero");

  const textBlocks = siteBlocks.filter(
    (b) =>
      b.slug !== LANDING_IMAGES_SLUG &&
      b.slug !== NUTRICIONISTA_PAGE_SLUG &&
      b.slug !== PAYMENT_CHAT_POLICY_SLUG &&
      b.slug !== PAYMENT_CHECKOUT_POLICY_SLUG &&
      b.slug !== CURRENCY_POLICY_SLUG,
  );

  const activeTab = tabs.find((t) => t.id === tab)!;

  return (
    /* Layout de 3 columnas: nav | editor | preview */
    <div className="grid gap-4 xl:grid-cols-[220px_minmax(0,1fr)_380px] xl:items-start">

      {/* ── 1. Navegación lateral ── */}
      <nav className="flex gap-2 overflow-x-auto pb-1 xl:sticky xl:top-4 xl:flex-col xl:overflow-x-visible xl:pb-0">
        {tabs.map((t) => {
          const active = tab === t.id;
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              className={`group shrink-0 rounded-2xl px-4 py-3 text-left transition xl:w-full ${
                active
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "bg-white text-foreground/70 ring-1 ring-foreground/10 hover:bg-muted/40 hover:ring-foreground/20"
              }`}
            >
              <span className="text-sm font-bold">{t.label}</span>
              <p
                className={`mt-1 hidden text-xs leading-snug xl:block ${
                  active ? "text-primary-foreground/70" : "text-foreground/45"
                }`}
              >
                {t.description}
              </p>
            </button>
          );
        })}
      </nav>

      {/* ── 2. Editor ── */}
      <div className="min-w-0 space-y-4">
        {/* Cabecera de contexto */}
        <div className="rounded-2xl border border-foreground/8 bg-white px-5 py-3.5">
          <div className="flex items-center gap-2">
            <h2 className="text-base font-bold text-primary">{activeTab.label}</h2>
            <span className="ml-auto rounded-full bg-muted px-2.5 py-0.5 text-[10px] font-semibold text-foreground/50">
              Afecta: {activeTab.affects}
            </span>
          </div>
        </div>

        {tab === "imagenes" && (
          <LandingImagesEditor
            initial={landingImages}
            onLiveChange={(data, section) => {
              setLiveImages(data);
              if (section) setLiveImageSection(section);
            }}
          />
        )}

        {tab === "web" && (
          <SiteContentEditor
            blocks={textBlocks}
            onLiveChange={(updatedBlocks) => setLiveTextBlocks(updatedBlocks)}
          />
        )}

        {tab === "conocerme" && (
          <NutricionistaCvEditor
            initial={nutricionistaPage}
            onLiveChange={(data) => setLiveNutricionista(data)}
          />
        )}

        {tab === "pagos" && (
          <PaymentCheckoutPolicyEditor
            initial={paymentCheckoutPolicy}
            onLiveChange={(data) => setLivePaymentPolicy(data)}
          />
        )}

        {tab === "recursos" && (
          <div className="rounded-2xl border border-foreground/10 bg-white p-6">
            <h3 className="text-lg font-bold">Biblioteca digital</h3>
            <p className="mt-1.5 text-sm text-foreground/60">
              Subí portadas, archivos y enlaces para tus pacientes. Los
              recursos tipo <strong>Paquete</strong> publicados aparecen en{" "}
              <Link
                href="/resources"
                target="_blank"
                className="font-semibold text-primary hover:underline"
              >
                /resources ↗
              </Link>{" "}
              para visitantes públicos.
            </p>
            <div className="mt-4 flex items-center gap-2 rounded-xl border border-foreground/10 bg-muted/40 px-4 py-3">
              <span className="text-2xl font-bold text-primary">{resourceCount}</span>
              <span className="text-sm text-foreground/60">recurso(s) publicado(s)</span>
            </div>
            <Link
              href="/dashboard/admin/resources"
              className="mt-6 inline-flex items-center gap-2 rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground"
            >
              Gestionar recursos →
            </Link>
          </div>
        )}
      </div>

      {/* ── 3. Panel de previsualización en vivo ── */}
      <div className="hidden xl:block">
        <PageSectionPreview
          tab={tab}
          imageSection={liveImageSection}
          images={liveImages}
          textBlocks={liveTextBlocks}
          nutricionista={liveNutricionista}
          paymentPolicy={livePaymentPolicy}
        />
      </div>
    </div>
  );
}
