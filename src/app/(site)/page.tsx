import Link from "next/link";
import { Suspense } from "react";
import { GemSelector } from "@/components/site/GemSelector";
import { GemstoneCard } from "@/components/site/GemstoneCard";
import { countByTypeAndCut, listGemstones } from "@/lib/gemstones/server";

async function ShopBySelection() {
  const gems = await listGemstones();
  return <GemSelector counts={countByTypeAndCut(gems)} />;
}

async function FeaturedGemstones() {
  const gems = (await listGemstones()).filter((g) => g.featured).slice(0, 3);
  if (!gems.length) return null;
  return (
    <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-3">
      {gems.map((g) => (
        <GemstoneCard key={g.id} gem={g} />
      ))}
    </div>
  );
}

function CardsSkeleton() {
  return (
    <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-3" aria-hidden>
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i}>
          <div className="aspect-[4/5] animate-pulse bg-pearl" />
          <div className="mt-4 h-4 w-1/3 animate-pulse bg-pearl" />
          <div className="mt-2 h-6 w-2/3 animate-pulse bg-pearl" />
        </div>
      ))}
    </div>
  );
}

export default function HomePage() {
  return (
    <>
      <section className="border-b border-line">
        <div className="mx-auto max-w-6xl px-4 py-20 text-center sm:px-6 sm:py-32">
          <p className="eyebrow">Fine natural gemstones</p>
          <h1 className="mx-auto mt-5 max-w-3xl font-serif text-5xl leading-[1.05] text-ink sm:text-7xl">
            Rare colour, <em className="text-garnet">chosen by hand</em>
          </h1>
          <p className="mx-auto mt-6 max-w-xl leading-relaxed text-stone">
            Each stone in our collection is personally selected for its colour, light and character.
            Reserve a gemstone or arrange a private viewing with our specialists.
          </p>
          <div className="mt-10 flex flex-col justify-center gap-3 sm:flex-row">
            <Link href="/gemstones" className="btn btn-primary">
              View the collection
            </Link>
            <Link href="/book" className="btn btn-outline">
              Book a consultation
            </Link>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 pt-20 sm:px-6">
        <div className="mb-10 text-center">
          <p className="eyebrow">Shop by gemstone &amp; cut</p>
          <h2 className="mt-2 font-serif text-4xl text-ink">Find your stone</h2>
        </div>
        <Suspense fallback={<div className="h-96 animate-pulse bg-pearl" aria-hidden />}>
          <ShopBySelection />
        </Suspense>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
        <div className="mb-10 flex items-end justify-between gap-4">
          <div>
            <p className="eyebrow">Featured</p>
            <h2 className="mt-2 font-serif text-4xl text-ink">Selected stones</h2>
          </div>
          <Link href="/collection" className="text-sm text-garnet underline-offset-4 hover:underline">
            See all
          </Link>
        </div>
        <Suspense fallback={<CardsSkeleton />}>
          <FeaturedGemstones />
        </Suspense>
      </section>

      <section className="border-y border-line bg-pearl">
        <div className="mx-auto grid max-w-6xl gap-10 px-4 py-20 sm:px-6 md:grid-cols-2 md:items-center">
          <div>
            <p className="eyebrow">Private consultation</p>
            <h2 className="mt-2 font-serif text-4xl text-ink">Looking for something specific?</h2>
            <p className="mt-4 leading-relaxed text-stone">
              Whether you are sourcing a centre stone, building a collection or exploring a trade
              partnership, our team will guide you personally.
            </p>
          </div>
          <div className="md:text-right">
            <Link href="/book" className="btn btn-primary">
              Book a consultation
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
