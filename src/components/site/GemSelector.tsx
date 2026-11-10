"use client";

import Link from "next/link";
import { useRef, useState } from "react";
import { CUTS, GEM_TYPES, gemType } from "@/lib/gemstones/catalog";
import { GemArt } from "./GemArt";

export interface SelectorCounts {
  byType: Record<string, number>;
  byCut: Record<string, number>;
  byTypeCut: Record<string, number>;
}

function Pill({ children, active }: { children: React.ReactNode; active?: boolean }) {
  return (
    <span
      className={`inline-block rounded-full px-4 py-1.5 text-[0.95rem] shadow-[0_2px_10px_rgba(28,25,23,0.10)] transition ${
        active ? "bg-garnet text-white" : "bg-white text-ink group-hover:text-garnet"
      }`}
    >
      {children}
    </span>
  );
}

function countLabel(n: number) {
  return n === 0 ? "On request" : `${n} ${n === 1 ? "stone" : "stones"}`;
}

/**
 * Two-step selection: choose a gemstone, then a cut. Each cut tile previews the
 * chosen gemstone in that cut and links to the matching listings.
 */
export function GemSelector({ counts, initialType = null }: { counts: SelectorCounts; initialType?: string | null }) {
  const [type, setType] = useState<string | null>(gemType(initialType) ? initialType : null);
  const cutsRef = useRef<HTMLElement>(null);
  const selected = gemType(type);

  function choose(slug: string) {
    const next = slug === type ? null : slug;
    setType(next);
    if (next && cutsRef.current && window.matchMedia("(max-width: 767px)").matches) {
      cutsRef.current.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }

  const typeQuery = type ? `type=${type}&` : "";

  return (
    <div className="space-y-16">
      <section aria-labelledby="choose-gem">
        <div className="mb-6 flex items-baseline gap-3">
          <span className="font-serif text-3xl text-garnet">1</span>
          <h2 id="choose-gem" className="font-serif text-3xl text-ink">
            Choose your gemstone
          </h2>
        </div>
        <ul className="grid grid-cols-3 gap-x-3 gap-y-6 sm:grid-cols-4 lg:grid-cols-6">
          {GEM_TYPES.map((t) => {
            const active = t.slug === type;
            const n = counts.byType[t.slug] ?? 0;
            return (
              <li key={t.slug}>
                <button
                  type="button"
                  onClick={() => choose(t.slug)}
                  aria-pressed={active}
                  className="group flex w-full flex-col items-center text-center focus-visible:outline-none"
                >
                  <span
                    className={`flex aspect-square w-full items-center justify-center rounded-sm border bg-white transition ${
                      active ? "border-garnet ring-2 ring-garnet/25" : "border-line group-hover:border-mist group-focus-visible:border-garnet"
                    }`}
                  >
                    <GemArt
                      shape={t.signatureCut}
                      palette={t.palette}
                      className="w-[62%] drop-shadow-[0_10px_12px_rgba(28,25,23,0.22)] transition duration-500 group-hover:scale-105"
                    />
                  </span>
                  <span className="-mt-4">
                    <Pill active={active}>{t.label}</Pill>
                  </span>
                  <span className="mt-1.5 text-xs text-stone">{countLabel(n)}</span>
                </button>
              </li>
            );
          })}
        </ul>
      </section>

      <section ref={cutsRef} aria-labelledby="choose-cut" className="scroll-mt-28">
        <div className="mb-6 flex flex-wrap items-baseline justify-between gap-3">
          <div className="flex items-baseline gap-3">
            <span className="font-serif text-3xl text-garnet">2</span>
            <h2 id="choose-cut" className="font-serif text-3xl text-ink">
              {selected ? `Choose the cut of your ${selected.label.toLowerCase()}` : "Choose a cut"}
            </h2>
          </div>
          {selected ? (
            <div className="flex items-center gap-4 text-sm">
              <button type="button" onClick={() => setType(null)} className="text-stone hover:text-ink">
                Clear
              </button>
              <Link href={`/collection?type=${selected.slug}`} className="btn btn-outline btn-sm">
                All {selected.plural.toLowerCase()} ({counts.byType[selected.slug] ?? 0})
              </Link>
            </div>
          ) : (
            <p className="text-sm text-stone">Pick a gemstone above to preview it in every cut.</p>
          )}
        </div>
        <ul className="grid grid-cols-3 gap-x-3 gap-y-6 sm:grid-cols-4 lg:grid-cols-6">
          {CUTS.map((c) => {
            const n = selected ? (counts.byTypeCut[`${selected.slug}/${c.slug}`] ?? 0) : (counts.byCut[c.slug] ?? 0);
            return (
              <li key={c.slug}>
                <Link
                  href={`/collection?${typeQuery}cut=${c.slug}`}
                  className="group flex flex-col items-center text-center focus-visible:outline-none"
                >
                  <span className="flex aspect-square w-full items-center justify-center rounded-sm border border-line bg-white transition group-hover:border-mist group-focus-visible:border-garnet">
                    {selected ? (
                      <GemArt
                        key={`${selected.slug}-${c.slug}`}
                        shape={c.slug}
                        palette={selected.palette}
                        className="animate-fade-in w-[58%] drop-shadow-[0_10px_12px_rgba(28,25,23,0.22)] transition duration-500 group-hover:scale-105"
                      />
                    ) : (
                      <GemArt shape={c.slug} mode="line" className="w-[56%] text-[#8a8790] transition group-hover:text-garnet" />
                    )}
                  </span>
                  <span className="-mt-4">
                    <Pill>{c.label}</Pill>
                  </span>
                  <span className={`mt-1.5 text-xs ${n ? "text-stone" : "text-mist"}`}>{countLabel(n)}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </section>
    </div>
  );
}
