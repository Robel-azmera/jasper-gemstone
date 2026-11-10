import { primaryImage, type Gemstone } from "@/lib/gemstones/types";
import { GemArt } from "./GemArt";

/**
 * Gemstone photo, or an illustrated gem in the stone's own cut and colours
 * when no photo has been uploaded yet.
 */
export function GemVisual({
  gem,
  className = "",
  size = "lg",
}: {
  gem: Pick<Gemstone, "name" | "images" | "imageUrl" | "palette" | "shape">;
  className?: string;
  size?: "lg" | "sm";
}) {
  const src = primaryImage(gem, size);
  if (src) {
    return (
      // eslint-disable-next-line @next/next/no-img-element -- pre-sized uploads served from /images/gems
      <img src={src} alt={gem.name} className={`h-full w-full object-cover ${className}`} loading="lazy" decoding="async" />
    );
  }
  return (
    <div
      className={`relative flex h-full w-full items-center justify-center overflow-hidden ${className}`}
      style={{ background: "radial-gradient(120% 90% at 30% 20%, #ffffff 0%, var(--color-pearl) 60%, #ebe3d6 100%)" }}
    >
      <GemArt
        shape={gem.shape}
        palette={gem.palette}
        title={gem.name}
        className="w-[52%] drop-shadow-[0_18px_22px_rgba(28,25,23,0.22)]"
      />
    </div>
  );
}
