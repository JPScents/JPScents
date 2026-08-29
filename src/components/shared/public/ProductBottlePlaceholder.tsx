export function ProductBottlePlaceholder({ className = "" }: { className?: string }) {
  return (
    <div
      className={`${className} grid h-full w-full place-items-center bg-[#eee7db]`}
      aria-label="Perfume bottle placeholder"
    >
      <div className="relative h-3/5 w-1/3 rounded-b-[32%] border border-[#b9b09f] bg-[#f8f3e9]">
        <span className="absolute -top-5 left-1/2 h-5 w-1/2 -translate-x-1/2 border border-[#8d8579] bg-[#393933]" />
        <span className="absolute left-1/2 top-[42%] -translate-x-1/2 text-center font-display text-base text-[#5f5b53]">
          JP
          <br />
          Scents
        </span>
      </div>
    </div>
  );
}
