import Link from "next/link";
export default function PerfumeNotFound() {
  return (
    <section>
      <p className="text-sm uppercase tracking-[.14em] text-jp-text-secondary">Perfumes</p>
      <h1 className="mt-2 font-display text-5xl">Perfume not found.</h1>
      <Link className="mt-5 inline-block underline" href="/admin/perfumes">
        Return to catalogue
      </Link>
    </section>
  );
}
