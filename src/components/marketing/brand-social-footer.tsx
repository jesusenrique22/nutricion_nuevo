"use client";

import { motion } from "framer-motion";
import { BrandAvatar } from "@/components/brand/brand-avatar";
import { BrandLinkButton } from "@/components/brand/brand-link-button";
import { BrandSocialIcons } from "@/components/brand/brand-social-icons";
import { BRAND_TAGLINE, SOCIAL_LINKS } from "@/lib/brand-links";

export function BrandSocialFooter() {
  return (
    <footer className="border-t border-primary/10 bg-gradient-to-b from-muted/40 to-background">
      <div className="mx-auto grid max-w-6xl gap-12 px-6 py-16 md:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)] md:items-start md:py-20">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="flex flex-col items-center text-center md:items-start md:text-left"
        >
          <BrandAvatar size={80} />
          <p className="mt-4 max-w-sm text-sm leading-relaxed text-foreground/70">
            {BRAND_TAGLINE}
          </p>
          <BrandSocialIcons className="mt-6" />
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.1 }}
        >
          <p className="text-center text-xs font-semibold uppercase tracking-[0.24em] text-foreground/50 md:text-left">
            Asesorías y planes · Síguenos
          </p>
          <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {SOCIAL_LINKS.map((link, i) => (
              <BrandLinkButton
                key={link.id}
                href={link.href}
                label={link.label}
                external={link.external}
                delay={i * 0.05}
                wide
              />
            ))}
          </div>
          <p className="mt-8 text-center text-xs text-foreground/45 md:text-left">
            Nutrición · Fitness · Wellness · Buenos Aires, Argentina · Est. 2025
          </p>
        </motion.div>
      </div>
    </footer>
  );
}
