import { Check } from "lucide-react";

import type { ScentCharacter } from "@/db/generated/client";
import { scentCharacterContent } from "../../constants";

export function ScentCharacterSelect({
  value,
  selected,
  onToggle,
}: {
  value: ScentCharacter;
  selected: boolean;
  onToggle: (value: ScentCharacter) => void;
}) {
  const item = scentCharacterContent[value];
  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={() => onToggle(value)}
      className={`relative aspect-[1.8/1] overflow-hidden border text-left text-jp-surface focus-visible:outline-2 focus-visible:outline-offset-4 lg:aspect-[1.4/1] ${selected ? "border-jp-text-primary ring-2 ring-inset ring-jp-text-primary" : "border-transparent"}`}
    >
      <img
        src={item.image}
        alt=""
        className="absolute inset-0 h-full w-full object-cover opacity-70"
      />
      <div className="absolute inset-0 bg-jp-text-primary/30" />
      {selected && (
        <span className="absolute right-3 top-3 grid size-7 place-items-center bg-jp-surface text-jp-text-primary">
          <Check className="size-4" aria-hidden="true" />
        </span>
      )}
      <span className="absolute bottom-3 left-3 font-display text-3xl">{item.label}</span>
    </button>
  );
}
