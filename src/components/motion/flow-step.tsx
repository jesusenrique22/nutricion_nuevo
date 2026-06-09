"use client";

import { AnimatePresence, motion } from "framer-motion";

export function FlowStep({
  stepKey,
  children,
  direction = 1,
}: {
  stepKey: string;
  children: React.ReactNode;
  direction?: 1 | -1;
}) {
  return (
    <AnimatePresence mode="wait" initial={false}>
      <motion.div
        key={stepKey}
        data-flow-motion
        initial={{ opacity: 0, x: direction * 28 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: direction * -28 }}
        transition={{ duration: 0.38, ease: [0.22, 1, 0.36, 1] }}
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
}

export function FlowStepDots({
  total,
  current,
}: {
  total: number;
  current: number;
}) {
  return (
    <div className="mb-6 flex justify-center gap-2">
      {Array.from({ length: total }).map((_, i) => (
        <motion.span
          key={i}
          animate={{
            scale: i === current ? 1.2 : 1,
            opacity: i === current ? 1 : 0.35,
          }}
          className={`h-2 w-2 rounded-full ${
            i === current ? "bg-primary" : "bg-primary/30"
          }`}
        />
      ))}
    </div>
  );
}
