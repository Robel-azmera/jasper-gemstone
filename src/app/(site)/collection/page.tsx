import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { GemArt } from "@/components/site/GemArt";
import { GemstoneCard } from "@/components/site/GemstoneCard";
import { CUTS, GEM_TYPES, cutDef, gemType } from "@/lib/gemstones/catalog";
import { listGemstones } from "@/lib/gemstones/server";
import type { Gemstone } from "@/lib/gemstones/types";

export const metadata: Metadata = {
  title: "Browse gemstones",
  description: "Browse our gemstones by type and cut.",
};

const SORTS = {
  newest: { label: "Newest", fn: (a: Gemstone, b: Gemstone) => b.createdAt - a.createdAt },
  "price-asc": { label: "Price ↑", fn: (a: Gemstone, b: Gemstone) => (a.price ?? Infinity) - (b.price ?? Infinity) },
  "price-desc": { label: "Price ↓", fn: (a: Gemstone, b: Gemstone) => (b.price ?? -1) - (a.price ?? -1) },
  carat: { label: "Carat", fn: (a: Gemstone, b: Gemstone) => (b.carat ?? 0) - (a.carat ?? 0) },
} as const;
type SortKey = keyof typeof SORTS;

type Query = { type?: string; cut?: string; sort?: SortKey; avail?: boolean };

function href(q: Query, patch: Partial<Record<keyof Query, string | boolean | undefined>>) {
  const merged = { ...q, ...patch };
  const p = new URLSearchParams();
  if (merged.type) p.set("type", String(merged.type));
  if (merged.cut) p.set("cut", String(merged.cut));
  if (merged.sort && merged.sort !== "newest") p.set("sort", String(merged.sort));
  if (merged.avail) p.set("avail", "1");
  const s = p.toString();
  return s ? `/collection?${s}` : "/collection";
}

async function Results({ searchParams }: { searchParams: PageProps<"/collection">["searchParams"] }) {
  const [all, sp] = await Promise.all([listGemstones(), searchParams]);
  const one = (v: string | string[] | undefined) => (typeof v === "string" ? v : undefined);
  const type = gemType(one(sp.type));
  const cut = cutDef(one(sp.cut));
  const sortParam = one(sp.sort);
  const sort: SortKey = sortParam && sortParam in SORTS ? (sortParam as SortKey) : "newest";
  const avail = one(sp.avail) === "1";
  const q: Query = { type: type?.slug, cut: cut?.slug, sort, avail };

  const ofType = type ? all.filter((g) => g.type === type.slug) : all;
  const gems = ofType
    .filter((g) => (!cut || g.shape === cut.slug) && (!avail || g.status === "available"))
    .sort((a, b) => Number(a.status === "sold") - Number(b.status === "sold") || SORTS[sort].fn(a, b));

  const cutCount = (slug: string) => ofType.filter((g) => g.shape === slug).length;
  const heroShape = cut?.slug ?? type?.signatureCut ?? "round";
  const palette = type?.palette ?? (["#6b1212", "#d0565b"] as [string, string]);
  const noun = type ? type.plural.toLowerCase() : "gemstones";
  const title = [cut?.label, type ? type.plural : cut ? "Gemstones" : "All gemstones"].filter(Boolean).join(" ");

  return (
    <>
      <nav className="mb-8 flex flex-wrap items-center gap-2 text-sm text-stone" aria-label="Breadcrumb">
        <Link href="/gemstones" className="hover:text-garnet">Gemstones</Link>
        {type && (
          <>
            <span aria-hidden>›</span>
            <Link href={href({}, { type: type.slug })} className="hover:text-garnet">{type.label}</Link>
          </>
        )}
        {cut && (
          <>
            <span aria-hidden>›</span>
            <span className="text-ink">{cut.label}</span>
          </>
        )}
      </nav>

      <section className="grid gap-8 border-b border-line pb-12 md:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] md:items-center md:gap-14">
        <div className="flex aspect-[4/3] items-center justify-center border border-line bg-white md:aspect-square">
          <GemArt
            key={`${type?.slug}-${heroShape}`}
            shape={heroShape}
            palette={palette}
            title={title}
            className="animate-fade-in w-[48%] drop-shadow-[0_22px_26px_rgba(28,25,23,0.25)]"
          />
        </div>
        <div>
          <p className="eyebrow">{gems.length} {gems.length === 1 ? "stone" : "stones"}</p>
          <h1 className="mt-2 font-serif text-4xl leading-tight text-ink sm:text-5xl">{title}</h1>

          <h2 className="mt-8 text-xs tracking-[0.2em] text-stone uppercase">
            {type ? `See ${type.label.toLowerCase()} in every cut` : "Cut"}
          </h2>
          <ul className="mt-3 grid grid-cols-4 gap-2 sm:grid-cols-6">
            {CUTS.map((c) => {
              const active = c.slug === cut?.slug;
              const n = cutCount(c.slug);
              return (
                <li key={c.slug}>
                  <Link
                    href={href(q, { cut: active ? undefined : c.slug })}
                    scroll={false}
                    aria-current={active ? "true" : undefined}
                    title={`${c.label} · ${n} in stock`}
                    className={`group flex flex-col items-center gap-1 border px-1 pt-2 pb-1.5 transition ${
                      active ? "border-garnet bg-garnet-soft" : "border-line bg-white hover:border-mist"
                    }`}
                  >
                    {type ? (
                      <GemArt shape={c.slug} palette={type.palette} className="h-9 w-9" />
                    ) : (
                      <GemArt shape={c.slug} mode="line" className={`h-9 w-9 ${active ? "text-garnet" : "text-[#8a8790]"}`} />
                    )}
                    <span className={`text-[0.7rem] ${active ? "text-garnet" : "text-ink"}`}>{c.label}</span>
                    <span className={`text-[0.65rem] ${n ? "text-stone" : "text-mist"}`}>{n}</span>
                  </Link>
                </li>
              );
            })}
          </ul>

          <h2 className="mt-8 text-xs tracking-[0.2em] text-stone uppercase">Gemstone</h2>
          <ul className="mt-3 flex flex-wrap gap-2">
            <li>
              <Link
                href={href(q, { type: undefined })}
                className={`inline-block rounded-full border px-3.5 py-1 text-sm transition ${
                  !type ? "border-garnet bg-garnet text-white" : "border-line bg-white hover:border-mist"
                }`}
              >
                All
              </Link>
            </li>
            {GEM_TYPES.map((t) => {
              const active = t.slug === type?.slug;
              return (
                <li key={t.slug}>
                  <Link
                    href={href(q, { type: t.slug })}
                    scroll={false}
                    className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-sm transition ${
                      active ? "border-garnet bg-garnet text-white" : "border-line bg-white hover:border-mist"
                    }`}
                  >
                    <span className="h-2.5 w-2.5 rounded-full" style={{ background: t.palette[0] }} aria-hidden />
                    {t.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      </section>

      <div className="my-8 flex flex-wrap items-center justify-between gap-4 text-sm">
        <div className="flex flex-wrap items-center gap-1">
          <span className="mr-2 text-stone">Sort</span>
          {(Object.keys(SORTS) as SortKey[]).map((k) => (
            <Link
              key={k}
              href={href(q, { sort: k })}
              scroll={false}
              className={`px-2.5 py-1 transition ${k === sort ? "bg-ink text-white" : "text-stone hover:text-ink"}`}
            >
              {SORTS[k].label}
            </Link>
          ))}
        </div>
        <Link href={href(q, { avail: !avail })} scroll={false} className="flex items-center gap-2 text-stone hover:text-ink">
          <span
            className={`flex h-4 w-4 items-center justify-center border ${avail ? "border-garnet bg-garnet text-white" : "border-mist"}`}
            aria-hidden
          >
            {avail && "✓"}
          </span>
          Available only
        </Link>
      </div>

      {gems.length ? (
        <div className="grid gap-x-8 gap-y-14 sm:grid-cols-2 lg:grid-cols-3">
          {gems.map((g) => (
            <GemstoneCard key={g.id} gem={g} />
          ))}
        </div>
      ) : (
        <div className="border border-dashed border-line bg-white px-6 py-16 text-center">
          <p className="font-serif text-2xl text-ink">
            No {cut ? `${cut.label.toLowerCase()} ` : ""}
            {noun} in the collection right now
          </p>
          <p className="mx-auto mt-3 max-w-md text-stone">
            Our specialists source stones to order. Tell us what you&apos;re looking for and we&apos;ll find it for you.
          </p>
          <div className="mt-6 flex flex-col justify-center gap-3 sm:flex-row">
            <Link href="/book" className="btn btn-primary">Request this stone</Link>
            <Link href={href({}, { type: type?.slug })} className="btn btn-outline">
              {type ? `See all ${noun}` : "Clear filters"}
            </Link>
          </div>
        </div>
      )}
    </>
  );
}

function ResultsSkeleton() {
  return (
    <div aria-hidden>
      <div className="mb-8 h-4 w-48 animate-pulse bg-pearl" />
      <div className="grid gap-8 md:grid-cols-[5fr_7fr]">
        <div className="aspect-square animate-pulse bg-pearl" />
        <div className="space-y-4">
          <div className="h-12 w-2/3 animate-pulse bg-pearl" />
          <div className="h-40 animate-pulse bg-pearl" />
        </div>
      </div>
    </div>
  );
}

export default function CollectionPage({ searchParams }: PageProps<"/collection">) {
  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 sm:py-14">
      <Suspense fallback={<ResultsSkeleton />}>
        <Results searchParams={searchParams} />
      </Suspense>
    </div>
  );
}
