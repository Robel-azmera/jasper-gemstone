import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { GemSelector } from "@/components/site/GemSelector";
import { GemstoneCard } from "@/components/site/GemstoneCard";
import { countByTypeAndCut, listGemstones } from "@/lib/gemstones/server";

export const metadata: Metadata = {
  title: "Choose your gemstone",
  description: "Choose a gemstone, then a cut, and browse matching stones from our collection.",
};

async function Selector({ searchParams }: { searchParams: PageProps<"/gemstones">["searchParams"] }) {
  const [gems, sp] = await Promise.all([listGemstones(), searchParams]);
  const initialType = typeof sp.type === "string" ? sp.type : null;
  const latest = gems.filter((g) => g.status !== "sold").slice(0, 3);
  return (
    <>
      <GemSelector counts={countByTypeAndCut(gems)} initialType={initialType} />
      {latest.length > 0 && (
        <section className="mt-24">
          <div className="mb-10 flex items-end justify-between gap-4">
            <div>
              <p className="eyebrow">Just added</p>
              <h2 className="mt-2 font-serif text-4xl text-ink">New gems</h2>
            </div>
            <Link href="/collection" className="text-sm text-garnet underline-offset-4 hover:underline">
              Browse all stones
            </Link>
          </div>
          <div className="grid gap-x-8 gap-y-14 sm:grid-cols-2 lg:grid-cols-3">
            {latest.map((g) => (
              <GemstoneCard key={g.id} gem={g} />
            ))}
          </div>
        </section>
      )}
    </>
  );
}

function SelectorSkeleton() {
  return (
    <div className="space-y-16" aria-hidden>
      {[0, 1].map((r) => (
        <div key={r}>
          <div className="mb-6 h-9 w-72 animate-pulse bg-pearl" />
          <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 lg:grid-cols-6">
            {Array.from({ length: 12 }).map((_, i) => (
              <div key={i} className="aspect-square animate-pulse bg-pearl" />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

export default function GemstonesPage({ searchParams }: PageProps<"/gemstones">) {
  return (
    <div className="mx-auto max-w-6xl px-4 py-14 sm:px-6 sm:py-16">
      <header className="mb-14 text-center">
        <p className="eyebrow">The collection</p>
        <h1 className="mt-3 font-serif text-5xl text-ink">Find your gemstone</h1>
        <p className="mx-auto mt-4 max-w-lg text-stone">
          Choose a gemstone, then the cut you love. We&apos;ll show you every matching stone in our collection.
        </p>
      </header>
      <Suspense fallback={<SelectorSkeleton />}>
        <Selector searchParams={searchParams} />
      </Suspense>
    </div>
  );
}
