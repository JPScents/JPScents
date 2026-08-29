import type { ScentCharacter } from "@/db/generated/client";

export const scentCharacterContent: Record<
  ScentCharacter,
  { label: string; cue: string; image: string }
> = {
  FRESH: {
    label: "Fresh",
    cue: "Airy · clean",
    image: "/scent-characters/scent-fresh-natural.png",
  },
  WARM: { label: "Warm", cue: "Soft · amber", image: "/scent-characters/scent-warm-natural.png" },
  SWEET: {
    label: "Sweet",
    cue: "Smooth · inviting",
    image: "/scent-characters/scent-sweet-natural.png",
  },
  WOODY: {
    label: "Woody",
    cue: "Grounded · rich",
    image: "/scent-characters/scent-woody-natural.png",
  },
};
