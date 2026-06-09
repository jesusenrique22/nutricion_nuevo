"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { BrandLinkHub } from "@/components/brand/brand-link-hub";

export function BrandFlowShell({
  children,
  backHref,
  backLabel = "← Volver",
  hub,
}: {
  children: React.ReactNode;
  backHref?: string;
  backLabel?: string;
  hub?: {
    greeting?: string;
    sectionTitle?: string;
    showSocialIcons?: boolean;
    showSeal?: boolean;
    compact?: boolean;
  };
}) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.35 }}
      className="mx-auto w-full max-w-lg"
    >
      {backHref && (
        <Link
          href={backHref}
          className="mb-4 inline-block text-sm font-semibold text-primary hover:underline"
        >
          {backLabel}
        </Link>
      )}

      {hub &&
        (hub.compact ? (
          hub.greeting ? (
            <p className="mb-2 text-center text-sm text-foreground/65">
              {hub.greeting}
            </p>
          ) : null
        ) : (
          <BrandLinkHub
            greeting={hub.greeting}
            sectionTitle={hub.sectionTitle}
            showSocialIcons={hub.showSocialIcons ?? false}
            showSeal={hub.showSeal ?? false}
            compact={false}
            links={[]}
          />
        ))}

      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15, duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
        className={hub ? "mt-6" : ""}
      >
        {children}
      </motion.div>
    </motion.div>
  );
}
