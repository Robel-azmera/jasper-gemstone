import { gemType, inferCut, inferType, isCutSlug, isGemTypeSlug } from "./catalog";
import { isGemstoneStatus, type GemImage, type Gemstone } from "./types";

function str(v: unknown, fallback = ""): string {
  return typeof v === "string" ? v : fallback;
}

function millis(v: unknown): number {
  if (v && typeof v === "object" && "toMillis" in v && typeof v.toMillis === "function") {
    return Number(v.toMillis()) || 0;
  }
  return typeof v === "number" ? v : 0;
}

function images(v: unknown): GemImage[] {
  if (!Array.isArray(v)) return [];
  return v.flatMap((i) =>
    i && typeof i === "object" && typeof i.id === "string" && /^[A-Za-z0-9_-]{8,64}$/.test(i.id)
      ? [{ id: i.id, w: Number(i.w) || 0, h: Number(i.h) || 0 }]
      : [],
  );
}

/** Turn a raw Firestore document (admin or client SDK) into a Gemstone. */
export function normalizeGemstone(id: string, data: Record<string, unknown>): Gemstone {
  const variety = str(data.variety);
  const type = isGemTypeSlug(data.type) ? data.type : inferType(variety);
  const def = gemType(type);
  const palette =
    Array.isArray(data.palette) && data.palette.length === 2
      ? ([str(data.palette[0], def?.palette[0]), str(data.palette[1], def?.palette[1])] as [string, string])
      : (def?.palette ?? ["#e9e1d4", "#8b1a1a"]);
  const cut = str(data.cut);
  return {
    id,
    name: str(data.name, "Untitled gemstone"),
    type,
    variety: variety || def?.label || "",
    shape: isCutSlug(data.shape) ? data.shape : inferCut(cut),
    carat: typeof data.carat === "number" ? data.carat : null,
    color: str(data.color),
    origin: str(data.origin),
    clarity: str(data.clarity),
    cut,
    treatment: str(data.treatment),
    dimensions: str(data.dimensions),
    certificate: str(data.certificate),
    price: typeof data.price === "number" ? data.price : null,
    currency: str(data.currency, "USD"),
    description: str(data.description),
    review: str(data.review),
    status: isGemstoneStatus(data.status) ? data.status : "available",
    images: images(data.images),
    imageUrl: typeof data.imageUrl === "string" && data.imageUrl ? data.imageUrl : null,
    palette,
    featured: data.featured === true,
    createdAt: millis(data.createdAt),
  };
}
