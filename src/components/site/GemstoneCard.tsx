import Link from "next/link";
import { cutLabel } from "@/lib/gemstones/catalog";
import { formatPerCarat, formatPrice } from "@/lib/gemstones/format";
import { GEMSTONE_STATUS_LABELS, type Gemstone } from "@/lib/gemstones/types";
import { GemVisual } from "./GemVisual";

export function GemstoneCard({ gem }: { gem: Gemstone }) {
  const perCarat = formatPerCarat(gem);
  return (
    <Link href={`/gemstones/${gem.id}`} className="group block">
      <div className="relative aspect-[4/5] overflow-hidden border border-line bg-pearl">
        <GemVisual gem={gem} size="sm" className="transition duration-700 group-hover:scale-[1.04]" />
        {gem.status !== "available" && (
          <span className="absolute top-3 left-3 bg-ivory/90 px-2.5 py-1 text-[0.65rem] tracking-[0.2em] text-stone uppercase">
            {GEMSTONE_STATUS_LABELS[gem.status]}
          </span>
        )}
      </div>
      <div className="mt-4">
        <p className="eyebrow">
          {gem.variety} · {cutLabel(gem.shape)}
        </p>
        <h3 className="mt-1 font-serif text-2xl text-ink transition group-hover:text-garnet">{gem.name}</h3>
        <p className="mt-1 text-sm text-stone">
          {[gem.carat ? `${gem.carat.toFixed(2)} ct` : "", gem.origin].filter(Boolean).join(" · ")}
        </p>
        <p className="mt-2 text-sm text-ink">
          {gem.status === "sold" ? "Sold" : formatPrice(gem)}
          {perCarat && gem.status !== "sold" && <span className="text-stone"> · {perCarat}/ct</span>}
        </p>
      </div>
    </Link>
  );
}
