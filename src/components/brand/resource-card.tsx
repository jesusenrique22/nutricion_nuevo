"use client";

import { motion } from "framer-motion";
import Image from "next/image";

export function ResourceCard({
  title,
  type,
  index,
  image,
}: {
  title: string;
  type: string;
  index: number;
  image?: string;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: false, margin: "-40px" }}
      transition={{ delay: index * 0.06, duration: 0.5 }}
      whileHover={{ y: -4 }}
      className="group cursor-pointer overflow-hidden rounded-2xl border border-foreground/10 bg-white transition hover:shadow-lg hover:shadow-primary/8"
    >
      <div className="relative aspect-[3/4] overflow-hidden bg-gradient-to-br from-primary/10 via-accent/20 to-muted/40">
        {image ? (
          <Image
            src={image}
            alt={title}
            fill
            className="object-cover transition duration-500 group-hover:scale-[1.03]"
            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
          />
        ) : (
          <div className="flex h-full flex-col items-center justify-center px-4 text-center">
            <span className="text-xs font-bold uppercase tracking-[0.2em] text-primary/70">
              {type}
            </span>
            <p className="mt-3 text-sm font-semibold leading-snug text-foreground/55">
              {title}
            </p>
          </div>
        )}
        <div className="absolute inset-0 bg-primary/0 transition group-hover:bg-primary/5" />
      </div>

      <div className="p-4">
        <span className="text-xs font-bold text-primary">{type}</span>
        <h3 className="mt-1 font-bold leading-snug">{title}</h3>
      </div>
    </motion.div>
  );
}
