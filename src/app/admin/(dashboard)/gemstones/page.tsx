"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useMemo, useState } from "react";
import { ConfirmDialog } from "@/components/admin/ui";
import { Spinner } from "@/components/booking/Spinner";
import { GemVisual } from "@/components/site/GemVisual";
import { GEM_TYPES, cutLabel, typeLabel } from "@/lib/gemstones/catalog";
import { deleteGemstone, subscribeGemstones } from "@/lib/gemstones/client";
import { formatPrice } from "@/lib/gemstones/format";
import { GEMSTONE_STATUS_LABELS, type Gemstone, type GemstoneStatus } from "@/lib/gemstones/types";

const STATUS_STYLE: Record<GemstoneStatus, string> = {
  available: "bg-success-soft text-success",
  reserved: "bg-warning-soft text-warning",
  sold: "bg-stone/10 text-stone",
};

function GemstonesView() {
  const saved = useSearchParams().get("saved");
  const [gems, setGems] = useState<Gemstone[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [type, setType] = useState("all");
  const [toDelete, setToDelete] = useState<Gemstone | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(
    () => subscribeGemstones(setGems, () => setError("Couldn't load gemstones. Please refresh.")),
    [],
  );

  const shown = useMemo(() => {
    const q = search.trim().toLowerCase();
    return (gems ?? []).filter(
      (g) =>
        (type === "all" || g.type === type) &&
        (!q || g.name.toLowerCase().includes(q) || g.id.includes(q) || g.variety.toLowerCase().includes(q)),
    );
  }, [gems, search, type]);

  async function confirmDelete() {
    if (!toDelete) return;
    setDeleting(true);
    try {
      await deleteGemstone(toDelete);
      setToDelete(null);
    } catch {
      setError("Couldn't delete the gemstone. Please try again.");
    } finally {
      setDeleting(false);
    }
  }

  const savedGem = saved ? gems?.find((g) => g.id === saved) : null;

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-serif text-4xl text-ink">Gemstones</h1>
          <p className="mt-1 text-sm text-stone">
            {gems ? `${gems.length} in the catalogue · ${gems.filter((g) => g.status === "available").length} available` : "Loading…"}
          </p>
        </div>
        <Link href="/admin/gemstones/edit" className="btn btn-primary">+ Add gemstone</Link>
      </div>

      {savedGem && (
        <p className="mb-4 border border-success/30 bg-success-soft px-4 py-3 text-sm text-success">
          Saved <strong>{savedGem.name}</strong>.{" "}
          <Link href={`/gemstones/${savedGem.id}`} target="_blank" className="underline">View on the website ↗</Link>
        </p>
      )}
      {error && <p className="mb-4 border border-danger/30 bg-danger-soft px-4 py-3 text-sm text-danger">{error}</p>}

      <div className="mb-4 flex flex-col gap-2 sm:flex-row">
        <input
          type="search"
          placeholder="Search by name, ID or variety"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="field-input text-sm sm:max-w-xs"
          aria-label="Search gemstones"
        />
        <select value={type} onChange={(e) => setType(e.target.value)} className="field-input text-sm sm:w-48" aria-label="Filter by gemstone">
          <option value="all">All gemstones</option>
          {GEM_TYPES.map((t) => (
            <option key={t.slug} value={t.slug}>{t.label}</option>
          ))}
        </select>
      </div>

      {!gems ? (
        <div className="flex justify-center py-20 text-stone"><Spinner className="h-6 w-6" /></div>
      ) : shown.length === 0 ? (
        <div className="border border-dashed border-line bg-white px-6 py-16 text-center text-stone">
          {gems.length ? "No gemstones match your search." : "No gemstones yet. Add your first one."}
        </div>
      ) : (
        <ul className="divide-y divide-line border border-line bg-white">
          {shown.map((g) => (
            <li key={g.id} className={`flex items-center gap-4 p-3 sm:p-4 ${g.id === saved ? "bg-success-soft/40" : ""}`}>
              <div className="h-16 w-16 shrink-0 overflow-hidden border border-line bg-pearl">
                <GemVisual gem={g} size="sm" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate font-serif text-lg text-ink">
                  {g.name} {g.featured && <span className="text-gold" title="Featured">★</span>}
                </p>
                <p className="truncate text-xs text-stone">
                  {typeLabel(g.type)} · {cutLabel(g.shape)}
                  {g.carat ? ` · ${g.carat.toFixed(2)} ct` : ""} · <span className="font-mono">{g.id}</span>
                </p>
                <p className="mt-0.5 text-sm text-ink sm:hidden">{formatPrice(g)}</p>
              </div>
              <p className="hidden w-32 text-right text-sm text-ink sm:block">{formatPrice(g)}</p>
              <span className={`hidden px-2 py-0.5 text-xs md:inline ${STATUS_STYLE[g.status]}`}>{GEMSTONE_STATUS_LABELS[g.status]}</span>
              <span className="hidden text-xs text-stone lg:inline">{g.images.length} photo{g.images.length === 1 ? "" : "s"}</span>
              <div className="flex shrink-0 gap-1">
                <Link href={`/admin/gemstones/edit?id=${encodeURIComponent(g.id)}`} className="btn btn-outline btn-sm">Edit</Link>
                <button type="button" onClick={() => setToDelete(g)} className="btn btn-ghost btn-sm text-danger" aria-label={`Delete ${g.name}`}>
                  Delete
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      <ConfirmDialog
        open={Boolean(toDelete)}
        title="Delete this gemstone?"
        body={
          <>
            <strong>{toDelete?.name}</strong> and its photos will be removed from the website permanently.
            Existing bookings for it are kept.
          </>
        }
        confirmLabel="Delete"
        tone="danger"
        busy={deleting}
        onConfirm={() => void confirmDelete()}
        onCancel={() => setToDelete(null)}
      />
    </div>
  );
}

export default function AdminGemstonesPage() {
  return (
    <Suspense fallback={<div className="flex justify-center py-20 text-stone"><Spinner className="h-6 w-6" /></div>}>
      <GemstonesView />
    </Suspense>
  );
}
