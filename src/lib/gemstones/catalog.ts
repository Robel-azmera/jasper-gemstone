// Gem types and cut shapes used for browsing, filtering and the admin form.
// Shared by server and client code.

export interface GemTypeDef {
  slug: string;
  label: string;
  plural: string;
  /** Two colours for the illustrated gem: deep tone, light tone. */
  palette: [string, string];
  /** Cut used for the type's tile illustration. */
  signatureCut: CutSlug;
}

export const CUTS = [
  { slug: "cushion", label: "Cushion" },
  { slug: "pear", label: "Pear" },
  { slug: "heart", label: "Heart" },
  { slug: "octagon", label: "Octagon" },
  { slug: "oval", label: "Oval" },
  { slug: "radiant", label: "Radiant" },
  { slug: "round", label: "Round" },
  { slug: "princess", label: "Princess" },
  { slug: "marquise", label: "Marquise" },
  { slug: "asscher", label: "Asscher" },
  { slug: "trillion", label: "Trillion" },
  { slug: "cabochon", label: "Cabochon" },
] as const;

export type CutSlug = (typeof CUTS)[number]["slug"];

export const GEM_TYPES: GemTypeDef[] = [
  { slug: "emerald", label: "Emerald", plural: "Emeralds", palette: ["#035c3a", "#2fd08a"], signatureCut: "octagon" },
  { slug: "tourmaline", label: "Tourmaline", plural: "Tourmalines", palette: ["#1d8f98", "#a6f0ea"], signatureCut: "oval" },
  { slug: "sapphire", label: "Sapphire", plural: "Sapphires", palette: ["#0a1f86", "#3d6bff"], signatureCut: "cushion" },
  { slug: "spinel", label: "Spinel", plural: "Spinels", palette: ["#9c2b55", "#f08cb0"], signatureCut: "cushion" },
  { slug: "ruby", label: "Ruby", plural: "Rubies", palette: ["#8c0620", "#ff2a55"], signatureCut: "octagon" },
  { slug: "garnet", label: "Garnet", plural: "Garnets", palette: ["#b33a00", "#ffa43a"], signatureCut: "heart" },
  { slug: "opal", label: "Opal", plural: "Opals", palette: ["#d9d2ec", "#fff3e0"], signatureCut: "cabochon" },
  { slug: "tanzanite", label: "Tanzanite", plural: "Tanzanites", palette: ["#2a1c7c", "#8a78f0"], signatureCut: "trillion" },
  { slug: "aquamarine", label: "Aquamarine", plural: "Aquamarines", palette: ["#3d8fbd", "#c9ecfa"], signatureCut: "pear" },
  { slug: "amethyst", label: "Amethyst", plural: "Amethysts", palette: ["#4b1477", "#b477e8"], signatureCut: "round" },
  { slug: "topaz", label: "Topaz", plural: "Topazes", palette: ["#c26a12", "#ffd27a"], signatureCut: "radiant" },
  { slug: "other", label: "Other gems", plural: "Other gems", palette: ["#7a6a5a", "#e9e1d4"], signatureCut: "round" },
];

const typeBySlug = new Map(GEM_TYPES.map((t) => [t.slug, t]));
const cutBySlug = new Map<string, (typeof CUTS)[number]>(CUTS.map((c) => [c.slug, c]));

export function gemType(slug: string | null | undefined): GemTypeDef | undefined {
  return slug ? typeBySlug.get(slug) : undefined;
}

export function cutDef(slug: string | null | undefined) {
  return slug ? cutBySlug.get(slug) : undefined;
}

export function isCutSlug(v: unknown): v is CutSlug {
  return typeof v === "string" && cutBySlug.has(v);
}

export function isGemTypeSlug(v: unknown): v is string {
  return typeof v === "string" && typeBySlug.has(v);
}

export function cutLabel(slug: string): string {
  return cutDef(slug)?.label ?? slug;
}

export function typeLabel(slug: string): string {
  return gemType(slug)?.label ?? slug;
}

/** Best-effort mapping from a free-text variety (older records) to a type slug. */
export function inferType(variety: string): string {
  const v = variety.toLowerCase();
  for (const t of GEM_TYPES) if (t.slug !== "other" && v.includes(t.slug)) return t.slug;
  if (/tsavorite|spessart|rhodolite|demantoid|almandine/.test(v)) return "garnet";
  if (/paraiba|rubellite|indicolite/.test(v)) return "tourmaline";
  if (/padparadscha/.test(v)) return "sapphire";
  return "other";
}

/** Best-effort mapping from a free-text cut description to a cut slug. */
export function inferCut(cut: string): CutSlug {
  const c = cut.toLowerCase();
  if (c.includes("cabochon")) return "cabochon";
  if (/emerald|step|octagon/.test(c)) return "octagon";
  for (const { slug } of CUTS) if (c.includes(slug)) return slug;
  if (c.includes("brilliant")) return "round";
  return "round";
}
