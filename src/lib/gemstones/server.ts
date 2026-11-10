import "server-only";

import { connection } from "next/server";
import { cache } from "react";
import demo from "@/data/demo-gemstones.json";
import { adminDb, isAdminConfigured } from "@/lib/firebase/admin";
import { normalizeGemstone } from "./normalize";
import type { Gemstone } from "./types";

export const GEMSTONES_COLLECTION = "gemstones";
export const GEM_IMAGES_COLLECTION = "gemstoneImages";

export { normalizeGemstone };

const demoGemstones: Gemstone[] = (demo as Array<Record<string, unknown>>).map((g) =>
  normalizeGemstone(String(g.id), g),
);

/** True when the site is showing the bundled demo catalogue (no Firebase). */
export function usingDemoCatalogue(): boolean {
  return !isAdminConfigured();
}

/** Whole catalogue, newest first. De-duplicated within a single request. */
export const listGemstones = cache(async (): Promise<Gemstone[]> => {
  await connection(); // availability must be fresh: always read at request time
  if (!isAdminConfigured()) return demoGemstones;
  const snap = await adminDb().collection(GEMSTONES_COLLECTION).get();
  return snap.docs
    .map((d) => normalizeGemstone(d.id, d.data()))
    .sort((a, b) => b.createdAt - a.createdAt || a.name.localeCompare(b.name));
});

export async function getGemstone(id: string): Promise<Gemstone | null> {
  await connection();
  if (!/^[A-Za-z0-9_-]{1,128}$/.test(id)) return null;
  if (!isAdminConfigured()) return demoGemstones.find((g) => g.id === id) ?? null;
  const doc = await adminDb().collection(GEMSTONES_COLLECTION).doc(id).get();
  return doc.exists ? normalizeGemstone(doc.id, doc.data() ?? {}) : null;
}

/** Number of stones per type and per type+cut, for the selection tiles. */
export function countByTypeAndCut(gems: Gemstone[]) {
  const byType: Record<string, number> = {};
  const byCut: Record<string, number> = {};
  const byTypeCut: Record<string, number> = {};
  for (const g of gems) {
    byType[g.type] = (byType[g.type] ?? 0) + 1;
    byCut[g.shape] = (byCut[g.shape] ?? 0) + 1;
    byTypeCut[`${g.type}/${g.shape}`] = (byTypeCut[`${g.type}/${g.shape}`] ?? 0) + 1;
  }
  return { byType, byCut, byTypeCut };
}

export type GemCounts = ReturnType<typeof countByTypeAndCut>;
