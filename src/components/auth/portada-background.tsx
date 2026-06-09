"use client";

import { AnimatePresence, motion } from "framer-motion";
import Image from "next/image";
import { useEffect, useState } from "react";
import { BRAND_PORTADAS } from "@/lib/brand-assets";

const PORTADAS = [
  { src: BRAND_PORTADAS.dark, alt: "Portada oscura Anttova" },
  { src: BRAND_PORTADAS.cream, alt: "Portada crema Anttova" },
  { src: BRAND_PORTADAS.pink, alt: "Portada rosa Anttova" },
];

export function PortadaBackground({ children }: { children: React.ReactNode }) {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setIndex((i) => (i + 1) % PORTADAS.length);
    }, 5000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden px-6 py-12">
      <AnimatePresence mode="wait">
        <motion.div
          key={PORTADAS[index].src}
          initial={{ opacity: 0, scale: 1.02 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 1.1, ease: "easeInOut" }}
          className="absolute inset-0"
        >
          <Image
            src={PORTADAS[index].src}
            alt={PORTADAS[index].alt}
            fill
            priority
            className="object-cover"
            sizes="100vw"
          />
          <div className="absolute inset-0 bg-background/45 backdrop-blur-[1px]" />
        </motion.div>
      </AnimatePresence>

      <div className="relative z-10 w-full max-w-md">{children}</div>
    </div>
  );
}
