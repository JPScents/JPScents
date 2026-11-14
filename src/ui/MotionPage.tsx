"use client";

import type { ReactNode } from "react";
import { motion, useReducedMotion } from "motion/react";

export function MotionPage({
  children,
  routeKey,
  className,
}: {
  children: ReactNode;
  routeKey: string;
  className?: string;
}) {
  const reduceMotion = useReducedMotion();
  return (
    <motion.main
      key={routeKey}
      className={className}
      initial={reduceMotion ? false : { opacity: 0.99, y: 2 }}
      animate={{ opacity: 1, y: 0 }}
      transition={reduceMotion ? { duration: 0 } : { duration: 0.22, ease: "easeOut" }}
    >
      {children}
    </motion.main>
  );
}
