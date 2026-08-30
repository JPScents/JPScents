import Image from "next/image";

import { cn } from "@/lib/utils";

export function BrandLogo({
  className,
  tone = "default",
}: {
  className?: string;
  tone?: "default" | "light";
}) {
  return (
    <span className={cn("relative block aspect-[355/478] shrink-0", className)}>
      <Image
        src={tone === "light" ? "/brand/jp-scents-logo-light.png" : "/brand/jp-scents-logo.png"}
        alt="JP Scents — the fragrance you can’t resist"
        fill
        sizes="(min-width: 1024px) 8rem, 4rem"
        className="object-contain"
      />
    </span>
  );
}
