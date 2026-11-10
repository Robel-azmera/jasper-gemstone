import type { Gemstone } from "@/lib/gemstones/types";

/**
 * Gemstone image, or an elegant faceted placeholder built from the stone's
 * palette when no photo is uploaded yet.
 */
export function GemVisual({ gem, className = "" }: { gem: Gemstone; className?: string }) {
  if (gem.imageUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element -- admin-provided URLs from any host
      <img
        src={gem.imageUrl}
        alt={gem.name}
        className={`h-full w-full object-cover ${className}`}
        loading="lazy"
      />
    );
  }
  const [a, b] = gem.palette;
  return (
    <div
      role="img"
      aria-label={gem.name}
      className={`relative flex h-full w-full items-center justify-center overflow-hidden ${className}`}
      style={{ background: `radial-gradient(120% 90% at 30% 20%, #ffffff 0%, var(--color-pearl) 55%, #ebe3d6 100%)` }}
    >
      <svg viewBox="0 0 100 100" className="w-[46%] drop-shadow-[0_18px_24px_rgba(28,25,23,0.18)]" aria-hidden>
        <defs>
          <linearGradient id={`g-${gem.id}`} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor={a} />
            <stop offset="100%" stopColor={b} />
          </linearGradient>
        </defs>
        <polygon points="50,6 86,30 86,70 50,94 14,70 14,30" fill={`url(#g-${gem.id})`} />
        <polygon points="50,6 86,30 50,40 14,30" fill="#fff" opacity="0.28" />
        <polygon points="50,40 86,30 86,70 50,60" fill="#000" opacity="0.08" />
        <polygon points="50,60 86,70 50,94 14,70" fill="#000" opacity="0.16" />
        <polygon points="14,30 50,40 50,60 14,70" fill="#fff" opacity="0.1" />
        <polygon points="50,40 62,50 50,60 38,50" fill="#fff" opacity="0.35" />
      </svg>
    </div>
  );
}
