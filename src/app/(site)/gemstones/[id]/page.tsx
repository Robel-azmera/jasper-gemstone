import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { BookGemstoneButton } from "@/components/booking/BookGemstoneButton";
import { GemGallery } from "@/components/site/GemGallery";
import { GemstoneCard } from "@/components/site/GemstoneCard";
import { cutLabel, gemType, typeLabel } from "@/lib/gemstones/catalog";
import { formatPerCarat, formatPrice } from "@/lib/gemstones/format";
import { listGemstones } from "@/lib/gemstones/server";
import { GEMSTONE_STATUS_LABELS } from "@/lib/gemstones/types";

async function GemstoneDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const all = await listGemstones();
  const gem = all.find((g) => g.id === id);
  if (!gem) notFound();

  const sameType = all.filter((g) => g.type === gem.type && g.status !== "sold");
  const cutCounts: Record<string, number> = {};
  for (const g of sameType) cutCounts[g.shape] = (cutCounts[g.shape] ?? 0) + 1;
  const related = sameType.filter((g) => g.id !== gem.id).slice(0, 3);
  const perCarat = formatPerCarat(gem);

  const available = gem.status === "available";
  const specs: Array<[string, string]> = [
    ["Gemstone", gem.variety],
    ["Shape", cutLabel(gem.shape)],
    ["Weight", gem.carat ? `${gem.carat.toFixed(2)} ct` : ""],
    ["Colour", gem.color],
    ["Origin", gem.origin],
    ["Clarity", gem.clarity],
    ["Cut", gem.cut],
    ["Dimensions", gem.dimensions],
    ["Treatment", gem.treatment],
    ["Certificate", gem.certificate],
    ["Stone ID", gem.id],
  ].filter((row): row is [string, string] => Boolean(row[1]));

  return (
    <>
    <div className="grid gap-10 md:grid-cols-2 md:gap-16">
      <div className="md:sticky md:top-28 md:self-start">
        <GemGallery
          name={gem.name}
          images={gem.images}
          imageUrl={gem.imageUrl}
          palette={gem.palette}
          shape={gem.shape}
          type={gem.type}
          typeLabel={typeLabel(gem.type)}
          typePlural={gemType(gem.type)?.plural ?? "gemstones"}
          cutCounts={cutCounts}
        />
      </div>

      <div>
        <p className="eyebrow">
          <Link href={`/collection?type=${gem.type}`} className="hover:text-garnet">{gem.variety}</Link>
          {" · "}
          <Link href={`/collection?type=${gem.type}&cut=${gem.shape}`} className="hover:text-garnet">{cutLabel(gem.shape)}</Link>
        </p>
        <h1 className="mt-2 font-serif text-4xl leading-tight text-ink sm:text-5xl">{gem.name}</h1>
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <p className="text-xl text-ink">
            {formatPrice(gem)}
            {perCarat && <span className="ml-2 text-sm text-stone">{perCarat} / ct</span>}
          </p>
          <span
            className={`px-2.5 py-1 text-[0.65rem] tracking-[0.2em] uppercase ${
              available ? "bg-success-soft text-success" : "bg-warning-soft text-warning"
            }`}
          >
            {GEMSTONE_STATUS_LABELS[gem.status]}
          </span>
        </div>

        {gem.description && <p className="mt-6 leading-relaxed whitespace-pre-line text-stone">{gem.description}</p>}

        {/* Booking call to action */}
        <div className="mt-8 border border-line bg-white p-5 sm:p-6">
          <BookGemstoneButton
            gemstone={{ id: gem.id, name: gem.name, variety: gem.variety, available }}
          />
          <p className="mt-3 text-sm text-stone">
            {available
              ? "Submit a no-obligation request. Our team will confirm availability and contact you personally."
              : "This stone is currently not available, but we're happy to discuss it or find a similar gem."}
          </p>
          <p className="mt-3 text-sm">
            Not sure yet?{" "}
            <Link href="/book" className="text-garnet underline underline-offset-4">
              Book a general consultation
            </Link>
          </p>
        </div>

        <dl className="mt-10 divide-y divide-line border-y border-line">
          {specs.map(([k, v]) => (
            <div key={k} className="grid grid-cols-3 gap-4 py-3 text-sm">
              <dt className="text-stone">{k}</dt>
              <dd className="col-span-2 text-ink">{v}</dd>
            </div>
          ))}
        </dl>

        {gem.review && (
          <section className="mt-10 border-l-2 border-gold bg-white px-5 py-5 sm:px-6">
            <h2 className="eyebrow">Gemologist&apos;s review</h2>
            <p className="mt-3 font-serif text-lg leading-relaxed whitespace-pre-line text-ink">{gem.review}</p>
          </section>
        )}
      </div>
    </div>

    {related.length > 0 && (
      <section className="mt-24">
        <div className="mb-10 flex items-end justify-between gap-4">
          <h2 className="font-serif text-3xl text-ink">More {(gemType(gem.type)?.plural ?? "gemstones").toLowerCase()}</h2>
          <Link href={`/collection?type=${gem.type}`} className="text-sm text-garnet underline-offset-4 hover:underline">
            See all
          </Link>
        </div>
        <div className="grid gap-x-8 gap-y-14 sm:grid-cols-2 lg:grid-cols-3">
          {related.map((g) => (
            <GemstoneCard key={g.id} gem={g} />
          ))}
        </div>
      </section>
    )}
    </>
  );
}

function DetailSkeleton() {
  return (
    <div className="grid gap-10 md:grid-cols-2 md:gap-16" aria-hidden>
      <div className="aspect-square animate-pulse bg-pearl" />
      <div className="space-y-4">
        <div className="h-4 w-24 animate-pulse bg-pearl" />
        <div className="h-12 w-3/4 animate-pulse bg-pearl" />
        <div className="h-24 animate-pulse bg-pearl" />
        <div className="h-28 animate-pulse bg-pearl" />
      </div>
    </div>
  );
}

export default function GemstonePage({ params }: PageProps<"/gemstones/[id]">) {
  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 sm:py-16">
      <nav className="mb-8 text-sm text-stone" aria-label="Breadcrumb">
        <Link href="/collection" className="hover:text-garnet">
          ← Browse gemstones
        </Link>
      </nav>
      <Suspense fallback={<DetailSkeleton />}>
        <GemstoneDetail params={params} />
      </Suspense>
    </div>
  );
}
