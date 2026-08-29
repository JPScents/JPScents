import Link from "next/link";
import { Check } from "lucide-react";

/* eslint-disable @next/next/no-img-element -- local controlled scent assets use simple decorative images. */
import type { ScentCharacter } from "@/db/generated/client";
import { siteConfig } from "@/config/site";

export const scentCharacterContent: Record<ScentCharacter, { label: string; cue: string; image: string }> = {
  FRESH: { label: "Fresh", cue: "Airy · clean", image: "/scent-characters/scent-fresh-natural.png" },
  WARM: { label: "Warm", cue: "Soft · amber", image: "/scent-characters/scent-warm-natural.png" },
  SWEET: { label: "Sweet", cue: "Smooth · inviting", image: "/scent-characters/scent-sweet-natural.png" },
  WOODY: { label: "Woody", cue: "Grounded · rich", image: "/scent-characters/scent-woody-natural.png" },
};

export function ScentCharacterBrowse({ values }: { values: readonly ScentCharacter[] }) {
  return (
    <div className="grid grid-cols-2 gap-2.5 lg:grid-cols-4 lg:gap-6">
      {values.map((value, index) => {
        const item = scentCharacterContent[value];
        return (
          <Link
            href={`${siteConfig.routes.perfumes}?scent=${value}`}
            key={value}
            className="group relative aspect-[170/128] overflow-hidden bg-jp-stone p-[18px] text-jp-surface focus-visible:outline-2 focus-visible:outline-offset-4 lg:aspect-[29/33] lg:p-6"
          >
            <img
              src={item.image}
              alt=""
              className="absolute inset-0 h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
            />
            <div className="absolute inset-0 bg-gradient-to-b from-black/15 to-black/65" />
            <span className="relative hidden text-[10px] leading-3 tracking-[.15em] lg:block">
              0{index + 1}
            </span>
            <div className="relative flex h-full flex-col justify-between lg:absolute lg:inset-x-6 lg:bottom-6 lg:h-auto lg:flex-row lg:items-end lg:border-t lg:border-jp-surface/50 lg:pt-[18px]">
              <h3 className="font-display text-[27px] leading-[30px] lg:text-[30px] lg:leading-[34px]">
                {item.label}
              </h3>
              <p className="text-xs leading-[18px] lg:hidden">{item.cue}</p>
              <span className="hidden text-base leading-5 lg:block" aria-hidden="true">
                ↗
              </span>
            </div>
          </Link>
        );
      })}
    </div>
  );
}

export function ScentCharacterSelect({ value, selected, onToggle }: { value: ScentCharacter; selected: boolean; onToggle: (value: ScentCharacter) => void }) {
  const item = scentCharacterContent[value];
  return <button type="button" aria-pressed={selected} onClick={() => onToggle(value)} className={`relative aspect-[1.8/1] overflow-hidden border text-left text-jp-surface focus-visible:outline-2 focus-visible:outline-offset-4 lg:aspect-[1.4/1] ${selected ? "border-jp-text-primary ring-2 ring-inset ring-jp-text-primary" : "border-transparent"}`}><img src={item.image} alt="" className="absolute inset-0 h-full w-full object-cover opacity-70" /><div className="absolute inset-0 bg-jp-text-primary/30" />{selected && <span className="absolute right-3 top-3 grid size-7 place-items-center bg-jp-surface text-jp-text-primary"><Check className="size-4" aria-hidden="true" /></span>}<span className="absolute bottom-3 left-3 font-display text-3xl">{item.label}</span></button>;
}
