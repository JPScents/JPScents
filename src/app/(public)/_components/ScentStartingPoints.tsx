import { MotionReveal } from "@/components/shared/MotionReveal";
import { ScentCharacterBrowse, publicScentCharacters } from "@/features/catalogue";
export function ScentStartingPoints() {
  return (
    <MotionReveal>
      <section className="border-b bg-jp-surface px-5 py-[54px] lg:px-[104px] lg:py-[88px]">
        <div className="mx-auto max-w-[1232px]">
          <p className="text-[11px] font-semibold uppercase tracking-[.17em] text-jp-olive">
            Start with what you like
          </p>
          <h2 className="mt-3 font-display text-[38px] lg:text-[50px]">
            Browse by scent character.
          </h2>
          <div className="mt-6 lg:mt-12">
            <ScentCharacterBrowse values={publicScentCharacters} />
          </div>
        </div>
      </section>
    </MotionReveal>
  );
}
