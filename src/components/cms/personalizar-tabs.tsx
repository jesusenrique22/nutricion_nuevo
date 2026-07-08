"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { PaymentCheckoutPolicyEditor } from "@/components/cms/payment-checkout-policy-editor";
import { LandingImagesEditor } from "@/components/cms/landing-images-editor";
import { LandingBlocksEditor } from "@/components/cms/landing-blocks-editor";
import { NavMenuEditor } from "@/components/cms/nav-menu-editor";
import { ProductsEditor } from "@/components/cms/products-editor";
import { NutricionistaCvEditor } from "@/components/cms/nutricionista-cv-editor";
import { SiteContentEditor } from "@/components/cms/site-content-editor";
import { PageSectionPreview } from "@/components/cms/page-section-preview";
import type { SiteContentDTO } from "@/server/actions/cms.actions";
import type { LandingBlocksData } from "@/types/landing-blocks";
import { CURRENCY_POLICY_SLUG } from "@/types/currency-policy";
import type { LandingImagesData } from "@/types/landing-images";
import { LANDING_IMAGES_SLUG } from "@/types/landing-images";
import { LANDING_BLOCKS_SLUG } from "@/types/landing-blocks";
import { NAV_MENU_SLUG } from "@/types/nav-menu";
import type { NavMenuData } from "@/types/nav-menu";
import { PRODUCTS_SLUG } from "@/types/products";
import type { ProductsData } from "@/types/products";
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
  {
    id: "otros",
    label: "Otros",
    description: "Secciones y menú del lobby",
    affects: "Página de inicio",
  },
] as const;

type TabId = (typeof tabs)[number]["id"];
type MobilePanel = "edit" | "preview";
type OtrosSection = "secciones" | "productos" | "menu";

const otrosSections: { id: OtrosSection; label: string; hint: string }[] = [
  {
    id: "secciones",
    label: "Secciones",
    hint: "Bloques extra del inicio: carruseles de fotos y banners con imagen y texto.",
  },
  {
    id: "productos",
    label: "Productos",
    hint: "Vitrina de productos con categorías, precio y botón a WhatsApp o enlace. Se ve en /productos.",
  },
  {
    id: "menu",
    label: "Menú del lobby",
    hint: "Las opciones que ve el visitante arriba del sitio. Agregá enlaces a secciones, páginas (como Productos) o sitios externos.",
  },
];

function PreviewPanel(props: {
  tab: TabId;
  otrosSection: OtrosSection;
  imageSection: "hero" | "gallery" | "plans" | "services" | "other";
  images: LandingImagesData;
  blocks: LandingBlocksData;
  navMenu: NavMenuData;
  products: ProductsData;
  textBlocks: SiteContentDTO[];
  nutricionista: NutricionistaPageData;
  paymentPolicy: PaymentCheckoutPolicy;
}) {
  return <PageSectionPreview {...props} />;
}

export function PersonalizarTabs({
  siteBlocks,
  resourceCount,
  landingImages,
  landingBlocks,
  navMenu,
  products,
  nutricionistaPage,
  paymentCheckoutPolicy,
}: {
  siteBlocks: SiteContentDTO[];
  resourceCount: number;
  landingImages: LandingImagesData;
  landingBlocks: LandingBlocksData;
  navMenu: NavMenuData;
  products: ProductsData;
  nutricionistaPage: NutricionistaPageData;
  paymentCheckoutPolicy: PaymentCheckoutPolicy;
}) {
  const [tab, setTab] = useState<TabId>("imagenes");
  const [mobilePanel, setMobilePanel] = useState<MobilePanel>("edit");

  useEffect(() => {
    setMobilePanel("edit");
  }, [tab]);

  const [otrosSection, setOtrosSection] = useState<OtrosSection>("secciones");

  // ── Estado en vivo para cada sección (se actualiza sin guardar) ──
  const [liveImages, setLiveImages] = useState(landingImages);
  const [liveBlocks, setLiveBlocks] = useState(landingBlocks);
  const [liveMenu, setLiveMenu] = useState(navMenu);
  const [liveProducts, setLiveProducts] = useState(products);
  const [liveTextBlocks, setLiveTextBlocks] = useState(siteBlocks);
  const [liveNutricionista, setLiveNutricionista] = useState(nutricionistaPage);
  const [livePaymentPolicy, setLivePaymentPolicy] = useState(paymentCheckoutPolicy);
  const [liveImageSection, setLiveImageSection] = useState<
    "hero" | "gallery" | "plans" | "services" | "other"
  >("hero");

  const textBlocks = siteBlocks.filter(
    (b) =>
      b.slug !== LANDING_IMAGES_SLUG &&
      b.slug !== LANDING_BLOCKS_SLUG &&
      b.slug !== NAV_MENU_SLUG &&
      b.slug !== PRODUCTS_SLUG &&
      b.slug !== NUTRICIONISTA_PAGE_SLUG &&
      b.slug !== PAYMENT_CHAT_POLICY_SLUG &&
      b.slug !== PAYMENT_CHECKOUT_POLICY_SLUG &&
      b.slug !== CURRENCY_POLICY_SLUG,
  );

  const activeTab = tabs.find((t) => t.id === tab)!;

  const previewProps = {
    tab,
    otrosSection,
    imageSection: liveImageSection,
    images: liveImages,
    blocks: liveBlocks,
    navMenu: liveMenu,
    products: liveProducts,
    textBlocks: liveTextBlocks,
    nutricionista: liveNutricionista,
    paymentPolicy: livePaymentPolicy,
  };

  const editorContent = (
    <>
      {tab === "imagenes" && (
        <LandingImagesEditor
          initial={landingImages}
          onLiveChange={(data, section) => {
            setLiveImages(data);
            if (section) setLiveImageSection(section);
          }}
        />
      )}

      {tab === "otros" && (
        <div className="space-y-4">
          <div className="rounded-2xl border border-foreground/10 bg-white p-3">
            <p className="px-1 pb-2 text-xs font-semibold text-foreground/50">
              Funciones nuevas del sitio. Elegí qué querés editar.
            </p>
            <div className="max-h-40 overflow-y-auto">
              <div className="flex flex-wrap gap-2">
                {otrosSections.map((s) => (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => setOtrosSection(s.id)}
                    className={`max-w-full rounded-full px-3 py-1.5 text-xs font-semibold leading-snug transition sm:px-4 ${
                      otrosSection === s.id
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted hover:bg-muted/80"
                    }`}
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            </div>
            <p className="mt-2 px-1 text-xs text-foreground/50">
              {otrosSections.find((s) => s.id === otrosSection)?.hint}
            </p>
          </div>

          {otrosSection === "secciones" && (
            <LandingBlocksEditor
              initial={landingBlocks}
              onLiveChange={(data) => setLiveBlocks(data)}
            />
          )}

          {otrosSection === "productos" && (
            <ProductsEditor
              initial={products}
              onLiveChange={(data) => setLiveProducts(data)}
            />
          )}

          {otrosSection === "menu" && (
            <NavMenuEditor
              initial={navMenu}
              onLiveChange={(data) => setLiveMenu(data)}
            />
          )}
        </div>
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
            Subí portadas, archivos y enlaces para tus pacientes. Los recursos
            tipo <strong>Paquete</strong> publicados aparecen en{" "}
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
    </>
  );

  return (
    <div className="space-y-3">
      <nav
        aria-label="Secciones de personalización"
        className="sticky top-0 z-20 -mx-1 border-b border-foreground/10 bg-white/95 backdrop-blur-sm"
      >
        <div className="md:hidden px-1 py-2">
          <label htmlFor="personalizar-section" className="sr-only">
            Sección a editar
          </label>
          <select
            id="personalizar-section"
            value={tab}
            onChange={(e) => setTab(e.target.value as TabId)}
            className="w-full rounded-xl border border-foreground/15 bg-white px-3 py-2.5 text-sm font-semibold text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-primary/10"
          >
            {tabs.map((t) => (
              <option key={t.id} value={t.id}>
                {t.label}
              </option>
            ))}
          </select>
          <p className="mt-1 truncate px-1 text-[10px] text-foreground/45">
            {activeTab.description} · Afecta: {activeTab.affects}
          </p>
        </div>

        <div className="hidden md:block">
          <div className="overflow-x-auto overscroll-x-contain">
            <div
              className="flex min-w-max gap-0.5 px-1 py-1.5"
              role="tablist"
            >
              {tabs.map((t) => {
                const active = tab === t.id;
                return (
                  <button
                    key={t.id}
                    type="button"
                    role="tab"
                    aria-selected={active}
                    onClick={() => setTab(t.id)}
                    title={t.description}
                    className={`shrink-0 rounded-lg px-3.5 py-2 text-sm font-semibold whitespace-nowrap transition lg:px-4 ${
                      active
                        ? "bg-primary text-primary-foreground shadow-sm"
                        : "text-foreground/60 hover:bg-muted/60 hover:text-foreground"
                    }`}
                  >
                    {t.label}
                  </button>
                );
              })}
            </div>
          </div>
          <p className="border-t border-foreground/5 px-2 py-1.5 text-[11px] text-foreground/45">
            <span className="font-medium text-foreground/55">
              {activeTab.label}
            </span>
            {" · "}
            {activeTab.description}
            {" · "}
            Afecta: {activeTab.affects}
          </p>
        </div>
      </nav>

      <div className="flex rounded-full border border-foreground/10 bg-white p-0.5 md:hidden">
        {(
          [
            ["edit", "Editar"],
            ["preview", "Vista previa"],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            type="button"
            onClick={() => setMobilePanel(id)}
            className={`flex-1 rounded-full px-3 py-2 text-xs font-bold transition sm:text-sm ${
              mobilePanel === id
                ? "bg-primary text-primary-foreground shadow-sm"
                : "text-foreground/55 hover:text-primary"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Editor + vista previa: ancho completo; preview a la derecha solo en pantallas grandes */}
      <div className="grid min-w-0 gap-4 xl:grid-cols-[minmax(0,1fr)_min(380px,34%)] xl:items-start">
        <div
          className={`min-w-0 space-y-4 ${
            mobilePanel === "preview" ? "hidden md:block" : ""
          }`}
        >
          {editorContent}
        </div>

        <div
          className={`min-w-0 xl:sticky xl:top-24 ${
            mobilePanel === "edit" ? "hidden md:block" : ""
          }`}
        >
          <PreviewPanel {...previewProps} />
        </div>
      </div>
    </div>
  );
}
