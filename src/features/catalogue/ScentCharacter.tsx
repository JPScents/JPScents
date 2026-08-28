import Link from "next/link";
import { Check } from "lucide-react";

/* eslint-disable @next/next/no-img-element -- local controlled scent assets use simple decorative images. */
import type { ScentCharacter } from "@/db/generated/client";
import { siteConfig } from "@/config/site";

export const scentCharacterContent: Record<ScentCharacter, { label: string; cue: string; image: string }> = {
  FRESH: { label: "Fresh", cue: "Bright and airy", image: "/scent-characters/scent-fresh-natural.png" },
  WARM: { label: "Warm", cue: "Soft and enveloping", image: "/scent-characters/scent-warm-natural.png" },
  SWEET: { label: "Sweet", cue: "Rich and comforting", image: "/scent-characters/scent-sweet-natural.png" },
  WOODY: { label: "Woody", cue: "Grounded and textured", image: "/scent-characters/scent-woody-natural.png" },
};

export function ScentCharacterBrowse({ values }: { values: readonly ScentCharacter[] }) {
  return <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">{values.map((value, index) => { const item = scentCharacterContent[value]; return <Link href={`${siteConfig.routes.perfumes}?scent=${value}`} key={value} className="group relative aspect-[4/5] overflow-hidden bg-jp-stone p-4 text-jp-surface focus-visible:outline-2 focus-visible:outline-offset-4"><img src={item.image} alt="" className="absolute inset-0 h-full w-full object-cover opacity-70 transition-transform duration-300 group-hover:scale-105" /><div className="absolute inset-0 bg-jp-text-primary/25" /><span className="relative text-xs tracking-[0.16em]">0{index + 1}</span><div className="absolute inset-x-4 bottom-4"><h3 className="font-display text-4xl">{item.label}</h3><p className="mt-1 text-xs">{item.cue}</p></div></Link>; })}</div>;
}

export function ScentCharacterSelect({ value, selected, onToggle }: { value: ScentCharacter; selected: boolean; onToggle: (value: ScentCharacter) => void }) {
  const item = scentCharacterContent[value];
  return <button type="button" aria-pressed={selected} onClick={() => onToggle(value)} className={`relative aspect-[1.8/1] overflow-hidden border text-left text-jp-surface focus-visible:outline-2 focus-visible:outline-offset-4 lg:aspect-[1.4/1] ${selected ? "border-jp-text-primary ring-2 ring-inset ring-jp-text-primary" : "border-transparent"}`}><img src={item.image} alt="" className="absolute inset-0 h-full w-full object-cover opacity-70" /><div className="absolute inset-0 bg-jp-text-primary/30" />{selected && <span className="absolute right-3 top-3 grid size-7 place-items-center bg-jp-surface text-jp-text-primary"><Check className="size-4" aria-hidden="true" /></span>}<span className="absolute bottom-3 left-3 font-display text-3xl">{item.label}</span></button>;
}
