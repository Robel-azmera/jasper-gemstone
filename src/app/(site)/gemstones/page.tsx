import type { Metadata } from "next";
import { Suspense } from "react";
import { GemstoneCard } from "@/components/site/GemstoneCard";
import { listGemstones } from "@/lib/gemstones/server";

export const metadata: Metadata = { title: "The Collection" };

async function Collection() {
  const gems = await listGemstones();
  if (!gems.length) {
    return <p className="py-20 text-center text-stone">New stones are being added. Please check back soon.</p>;
  }
  // Available stones first.
  const sorted = [...gems].sort(
    (a, b) => Number(b.status === "available") - Number(a.status === "available"),
  );
  return (
    <div className="grid gap-x-8 gap-y-14 sm:grid-cols-2 lg:grid-cols-3">
      {sorted.map((g) => (
        <GemstoneCard key={g.id} gem={g} />
      ))}
    </div>
  );
}

export default function GemstonesPage() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
      <header className="mb-14 text-center">
        <p className="eyebrow">The collection</p>
        <h1 className="mt-3 font-serif text-5xl text-ink">Our gemstones</h1>
        <p className="mx-auto mt-4 max-w-lg text-stone">
          Open any stone to see its details and request a reservation or private viewing.
        </p>
      </header>
      <Suspense
        fallback={
          <div className="grid gap-x-8 gap-y-14 sm:grid-cols-2 lg:grid-cols-3" aria-hidden>
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="aspect-[4/5] animate-pulse bg-pearl" />
            ))}
          </div>
        }
      >
        <Collection />
      </Suspense>
    </div>
  );
}
