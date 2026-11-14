import { preferenceLabel, type PublicPerfumeDetail } from "@/modules/catalogue";

function ProfileRows({ perfume }: { perfume: PublicPerfumeDetail }) {
  const rows = [
    {
      label: "Character",
      value: perfume.scentCharacters.map(preferenceLabel).join(" · "),
    },
    {
      label: "Occasion",
      value: perfume.occasions.map(preferenceLabel).join(" · "),
    },
    {
      label: "Day / Night",
      value: perfume.timesOfDay.map(preferenceLabel).join(" · "),
    },
  ];

  return (
    <dl>
      {rows.map((row, index) => (
        <div
          key={row.label}
          className={`grid min-h-[52px] grid-cols-[minmax(100px,0.65fr)_minmax(0,1fr)] items-center gap-4 border-t xl:grid-cols-[210px_minmax(0,1fr)] ${index === rows.length - 1 ? "border-b" : ""}`}
        >
          <dt className="text-[13px] leading-4 text-jp-text-secondary">{row.label}</dt>
          <dd className="min-w-0 break-words text-[15px] leading-[18px]">{row.value || "—"}</dd>
        </div>
      ))}
    </dl>
  );
}

export function DesktopProfile({ perfume }: { perfume: PublicPerfumeDetail }) {
  const characters = perfume.scentCharacters.map(preferenceLabel);
  const heading = characters.length
    ? `A ${characters.map((value) => value.toLowerCase()).join(", ")} profile.`
    : "A considered scent profile.";

  return (
    <section className="hidden bg-jp-surface pt-12 lg:block lg:px-8 xl:px-[72px]">
      <div className="mx-auto grid max-w-[1296px] grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)] gap-12 border-t pt-[38px] xl:grid-cols-[560px_620px] xl:gap-[90px]">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase leading-4 tracking-[.16em] text-jp-olive">
            Perfume character
          </p>
          <h2 className="mt-3.5 font-display text-[42px] leading-[46px]">{heading}</h2>
          <p className="mt-[15px] text-[15px] leading-[25px] text-jp-text-secondary">
            {perfume.scentCue}
          </p>
        </div>
        <div className="min-w-0">
          <p className="pb-4 text-xs font-semibold uppercase leading-4 tracking-[.16em] text-jp-olive">
            Scent profile
          </p>
          <ProfileRows perfume={perfume} />
        </div>
      </div>
    </section>
  );
}
