"use client";

import Link from "next/link";
import { useState } from "react";
import { CUTS, cutLabel } from "@/lib/gemstones/catalog";
import { gemImageUrl, type GemImage } from "@/lib/gemstones/types";
import { GemArt } from "./GemArt";

type View = { kind: "photo"; index: number } | { kind: "cut"; slug: string };

interface Props {
  name: string;
  images: GemImage[];
  imageUrl: string | null;
  palette: [string, string];
  shape: string;
  type: string;
  typeLabel: string;
  typePlural: string;
  /** In-stock count per cut for this gem type. */
  cutCounts: Record<string, number>;
}

export function GemGallery({ name, images, imageUrl, palette, shape, type, typeLabel, typePlural, cutCounts }: Props) {
  const photos = images.length
    ? images.map((img) => ({ lg: gemImageUrl(img, "lg"), sm: gemImageUrl(img, "sm") }))
    : imageUrl
      ? [{ lg: imageUrl, sm: imageUrl }]
      : [];
  const [view, setView] = useState<View>(photos.length ? { kind: "photo", index: 0 } : { kind: "cut", slug: shape });

  const previewCut = view.kind === "cut" ? view.slug : null;
  const otherCut = previewCut && previewCut !== shape ? previewCut : null;
  const otherCount = otherCut ? (cutCounts[otherCut] ?? 0) : 0;

  return (
    <div>
      <div className="relative aspect-square overflow-hidden border border-line bg-white">
        {view.kind === "photo" && photos[view.index] ? (
          // eslint-disable-next-line @next/next/no-img-element -- pre-sized uploads
          <img
            key={photos[view.index].lg}
            src={photos[view.index].lg}
            alt={`${name}, photo ${view.index + 1}`}
            className="animate-fade-in h-full w-full object-cover"
          />
        ) : (
          <div
            className="flex h-full w-full items-center justify-center"
            style={{ background: "radial-gradient(120% 90% at 30% 20%, #ffffff 0%, var(--color-pearl) 60%, #ebe3d6 100%)" }}
          >
            <GemArt
              key={previewCut}
              shape={previewCut ?? shape}
              palette={palette}
              title={`${name} illustrated in a ${cutLabel(previewCut ?? shape).toLowerCase()} cut`}
              className="animate-fade-in w-[54%] drop-shadow-[0_22px_26px_rgba(28,25,23,0.25)]"
            />
          </div>
        )}
        {otherCut && (
          <div className="absolute inset-x-3 bottom-3 flex flex-wrap items-center justify-between gap-2 bg-white/90 px-4 py-3 text-sm backdrop-blur">
            <span className="text-stone">
              Preview: this colour in a <span className="text-ink">{cutLabel(otherCut).toLowerCase()}</span> cut
            </span>
            <Link href={`/collection?type=${type}&cut=${otherCut}`} className="text-garnet underline-offset-4 hover:underline">
              {otherCount
                ? `See ${otherCount} ${cutLabel(otherCut).toLowerCase()} ${(otherCount === 1 ? typeLabel : typePlural).toLowerCase()} →`
                : `Request a ${cutLabel(otherCut).toLowerCase()} ${typeLabel.toLowerCase()} →`}
            </Link>
          </div>
        )}
      </div>

      {photos.length > 1 && (
        <ul className="mt-3 flex gap-2 overflow-x-auto pb-1" aria-label="Photos">
          {photos.map((p, i) => {
            const active = view.kind === "photo" && view.index === i;
            return (
              <li key={p.sm} className="shrink-0">
                <button
                  type="button"
                  onClick={() => setView({ kind: "photo", index: i })}
                  aria-label={`Show photo ${i + 1}`}
                  aria-pressed={active}
                  className={`block h-16 w-16 overflow-hidden border-2 transition ${active ? "border-garnet" : "border-transparent hover:border-line"}`}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element -- thumbnails */}
                  <img src={p.sm} alt="" className="h-full w-full object-cover" loading="lazy" />
                </button>
              </li>
            );
          })}
        </ul>
      )}

      <div className="mt-5">
        <p className="text-xs tracking-[0.2em] text-stone uppercase">See it in every cut</p>
        <ul className="mt-2 grid grid-cols-6 gap-1.5">
          {CUTS.map((c) => {
            const own = c.slug === shape;
            const active = view.kind === "cut" ? view.slug === c.slug : own && photos.length === 0;
            return (
              <li key={c.slug}>
                <button
                  type="button"
                  onClick={() =>
                    setView(own && photos.length ? { kind: "photo", index: 0 } : { kind: "cut", slug: c.slug })
                  }
                  aria-pressed={active}
                  title={own ? `${c.label} (this stone)` : `Preview in ${c.label.toLowerCase()} cut`}
                  className={`flex w-full flex-col items-center gap-0.5 border py-1.5 transition ${
                    active ? "border-garnet bg-garnet-soft" : "border-line bg-white hover:border-mist"
                  }`}
                >
                  <GemArt shape={c.slug} palette={palette} className="h-8 w-8" />
                  <span className={`text-[0.65rem] leading-tight ${active ? "text-garnet" : "text-ink"}`}>{c.label}</span>
                  <span className="text-[0.6rem] leading-tight text-stone">
                    {own ? "This stone" : (cutCounts[c.slug] ?? 0) ? `${cutCounts[c.slug]} in stock` : " "}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}
