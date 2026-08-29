"use client";

import type { ReactNode } from "react";
import { motion, useReducedMotion } from "motion/react";

type RevealProps = { children: ReactNode; className?: string; delay?: number; priority?: boolean };

export function MotionReveal({ children, className, delay = 0, priority = false }: RevealProps) {
  const reduceMotion = useReducedMotion();
  const hidden = reduceMotion ? false : { opacity: 0.985, y: priority ? 6 : 12 };
  return (
    <motion.div
      className={className}
      initial={hidden}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: priority ? 0 : 0.15 }}
      transition={reduceMotion ? { duration: 0 } : { duration: 0.28, delay, ease: "easeOut" }}
    >
      {children}
    </motion.div>
  );
}
