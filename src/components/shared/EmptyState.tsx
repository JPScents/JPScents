import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

export function EmptyState({
  eyebrow,
  title,
  description,
  children,
  className,
}: {
  eyebrow: string;
  title: string;
  description: string;
  children?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center border bg-jp-stone px-6 py-12 text-center sm:px-10 sm:py-16",
        className,
      )}
    >
      <p className="text-xs font-semibold uppercase tracking-[.16em] text-jp-text-secondary">
        {eyebrow}
      </p>
      <h2 className="mx-auto mt-4 max-w-3xl font-display text-4xl leading-tight sm:text-5xl">
        {title}
      </h2>
      <p className="mx-auto mt-4 max-w-xl text-sm leading-6 text-jp-text-secondary sm:text-base">
        {description}
      </p>
      {children ? <div className="mt-7 flex flex-wrap justify-center gap-3">{children}</div> : null}
    </div>
  );
}
