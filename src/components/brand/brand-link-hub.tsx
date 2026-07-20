"use client";

import { motion } from "framer-motion";
import { BrandAvatar } from "@/components/brand/brand-avatar";
import { BrandLinkButton } from "@/components/brand/brand-link-button";
import { BrandSeal } from "@/components/brand/brand-seal";
import { BrandSocialIcons } from "@/components/brand/brand-social-icons";
import {
  BRAND_TAGLINE,
  SOCIAL_LINKS,
  type BrandLinkItem,
  type SocialIconId,
} from "@/lib/brand-links";
import type { ContactameLink } from "@/types/contactame";

const DEFAULT_SOCIAL_ICON_LINKS: ContactameLink[] = SOCIAL_LINKS.filter((l) =>
  ["tiktok", "instagram", "linkedin", "youtube", "whatsapp"].includes(l.id),
).map((l) => ({
  id: l.id,
  label: l.label,
  href: l.href,
  enabled: true,
  kind: l.id as SocialIconId,
  external: true,
}));

export function BrandLinkHub({
  links = SOCIAL_LINKS,
  sectionTitle = "Asesorías y planes",
  showSocialIcons = true,
  showSeal = true,
  greeting,
  compact = false,
}: {
  links?: BrandLinkItem[];
  sectionTitle?: string;
  showSocialIcons?: boolean;
  showSeal?: boolean;
  greeting?: string;
  compact?: boolean;
}) {
  return (
    <div
      className={`mx-auto flex w-full max-w-[390px] flex-col items-center ${
        compact ? "py-4" : "py-2"
      }`}
    >
      <BrandAvatar size={compact ? 72 : 88} />

      <motion.p
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="mt-4 font-serif text-2xl tracking-tight text-foreground lowercase"
        style={{ fontFamily: "Georgia, 'Times New Roman', serif" }}
      >
        anttova.
      </motion.p>

      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.15 }}
        className="mt-3 max-w-[300px] text-center text-sm leading-relaxed text-foreground/70"
      >
        {greeting ?? BRAND_TAGLINE}
      </motion.p>

      {showSocialIcons && (
        <BrandSocialIcons className="mt-6" links={DEFAULT_SOCIAL_ICON_LINKS} />
      )}

      {links.length > 0 && (
        <>
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.35 }}
            className="mt-8 text-xs font-medium uppercase tracking-[0.2em] text-foreground/50"
          >
            {sectionTitle}
          </motion.p>

          <div className="mt-4 flex w-full flex-col items-center gap-3">
            {links.map((link, i) => (
              <BrandLinkButton
                key={link.id}
                href={link.href}
                label={link.label}
                subtitle={link.subtitle}
                external={link.external}
                delay={0.4 + i * 0.07}
              />
            ))}
          </div>
        </>
      )}

      {showSeal && links.length > 0 && <BrandSeal />}
    </div>
  );
}
