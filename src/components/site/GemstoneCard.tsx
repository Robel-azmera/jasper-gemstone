import Link from "next/link";
import { GEMSTONE_STATUS_LABELS, type Gemstone } from "@/lib/gemstones/types";
import { formatPrice } from "@/lib/gemstones/format";
import { GemVisual } from "./GemVisual";

export function GemstoneCard({ gem }: { gem: Gemstone }) {
  return (
    <Link href={`/gemstones/${gem.id}`} className="group block">
      <div className="relative aspect-[4/5] overflow-hidden border border-line bg-pearl">
        <GemVisual gem={gem} className="transition duration-700 group-hover:scale-[1.04]" />
        {gem.status !== "available" && (
          <span className="absolute top-3 left-3 bg-ivory/90 px-2.5 py-1 text-[0.65rem] tracking-[0.2em] text-stone uppercase">
            {GEMSTONE_STATUS_LABELS[gem.status]}
          </span>
        )}
      </div>
      <div className="mt-4">
        <p className="eyebrow">{gem.variety}</p>
        <h3 className="mt-1 font-serif text-2xl text-ink transition group-hover:text-garnet">{gem.name}</h3>
        <p className="mt-1 text-sm text-stone">
          {gem.carat ? `${gem.carat.toFixed(2)} ct · ` : ""}
          {gem.origin}
        </p>
        <p className="mt-2 text-sm text-ink">{formatPrice(gem)}</p>
      </div>
    </Link>
  );
}
