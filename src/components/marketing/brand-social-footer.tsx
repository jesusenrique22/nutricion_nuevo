"use client";

import { motion } from "framer-motion";
import { BrandAvatar } from "@/components/brand/brand-avatar";
import { BrandLinkButton } from "@/components/brand/brand-link-button";
import { BrandSocialIcons } from "@/components/brand/brand-social-icons";
import { BRAND_TAGLINE } from "@/lib/brand-links";
import { visibleContactameLinks } from "@/lib/contactame-parse";
import {
  DEFAULT_CONTACTAME,
  type ContactameData,
} from "@/types/contactame";

export function BrandSocialFooter({
  contactame = DEFAULT_CONTACTAME,
}: {
  contactame?: ContactameData;
}) {
  const links = visibleContactameLinks(contactame);

  return (
    <footer
      id="contacto"
      data-lobby-contact
      className="scroll-mt-24 w-full border-t border-primary/10 bg-gradient-to-b from-muted/40 to-background"
    >
      <div className="mx-auto grid w-full max-w-6xl gap-10 px-4 py-14 sm:gap-12 sm:px-6 sm:py-16 md:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)] md:items-start md:py-20">
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
          <BrandSocialIcons className="mt-6" links={links} />
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="min-w-0 w-full"
        >
          <p className="text-center text-xs font-semibold uppercase tracking-[0.24em] text-foreground/50 md:text-left">
            {contactame.sectionTitle}
          </p>
          {links.length > 0 ? (
            <div className="mt-5 grid w-full grid-cols-2 gap-2 sm:grid-cols-3 sm:gap-3 md:flex md:flex-wrap md:justify-start">
              {links.map((link, i) => (
                <div key={link.id} className="min-w-0">
                  <BrandLinkButton
                    href={link.href}
                    label={link.label}
                    external={link.external}
                    delay={i * 0.05}
                    wide
                    compact
                  />
                </div>
              ))}
            </div>
          ) : (
            <p className="mt-6 text-center text-sm text-foreground/45 md:text-left">
              No hay botones de contacto activos.
            </p>
          )}
          {contactame.footerLine.trim() ? (
            <p className="mt-8 text-balance text-center text-sm font-medium leading-relaxed text-primary/75 md:text-left">
              {contactame.footerLine}
            </p>
          ) : null}
        </motion.div>
      </div>
    </footer>
  );
}
