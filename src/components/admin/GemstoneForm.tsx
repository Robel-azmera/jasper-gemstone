"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRef, useState, type ChangeEvent, type ReactNode } from "react";
import { Spinner } from "@/components/booking/Spinner";
import { GemArt } from "@/components/site/GemArt";
import { GemVisual } from "@/components/site/GemVisual";
import { CUTS, GEM_TYPES, cutLabel, gemType } from "@/lib/gemstones/catalog";
import { deleteGemImages, gemstoneExists, saveGemstone, uploadGemImage } from "@/lib/gemstones/client";
import { formatPrice } from "@/lib/gemstones/format";
import { GEMSTONE_STATUS_LABELS, GEMSTONE_STATUSES, gemImageUrl, type GemImage, type Gemstone } from "@/lib/gemstones/types";
import { MAX_IMAGES, gemstoneInputSchema, slugify } from "@/lib/gemstones/validation";

const CURRENCIES = ["USD", "EUR", "GBP", "ETB", "AED", "CHF"];

type TextKey =
  | "name" | "id" | "variety" | "price" | "currency" | "carat" | "color" | "origin" | "clarity"
  | "cut" | "treatment" | "dimensions" | "certificate" | "description" | "review";

type Values = Record<TextKey, string> & {
  type: string;
  shape: string;
  status: string;
  featured: boolean;
  palette: [string, string];
  images: GemImage[];
};

function fromGem(g: Gemstone | null): Values {
  const def = GEM_TYPES[0];
  return {
    name: g?.name ?? "",
    id: g?.id ?? "",
    variety: g && g.variety !== gemType(g.type)?.label ? g.variety : "",
    price: g?.price != null ? String(g.price) : "",
    currency: g?.currency ?? "USD",
    carat: g?.carat != null ? String(g.carat) : "",
    color: g?.color ?? "",
    origin: g?.origin ?? "",
    clarity: g?.clarity ?? "",
    cut: g?.cut ?? "",
    treatment: g?.treatment ?? "",
    dimensions: g?.dimensions ?? "",
    certificate: g?.certificate ?? "",
    description: g?.description ?? "",
    review: g?.review ?? "",
    type: g?.type ?? "",
    shape: g?.shape ?? "",
    status: g?.status ?? "available",
    featured: g?.featured ?? false,
    palette: g?.palette ?? def.palette,
    images: g?.images ?? [],
  };
}

function num(v: string): number | null {
  const t = v.replace(/[, ]/g, "").trim();
  if (!t) return null;
  const n = Number(t);
  return Number.isFinite(n) ? n : NaN;
}

function Section({ title, hint, children }: { title: string; hint?: string; children: ReactNode }) {
  return (
    <section className="border border-line bg-white p-5 sm:p-6">
      <h2 className="font-serif text-2xl text-ink">{title}</h2>
      {hint && <p className="mt-1 text-sm text-stone">{hint}</p>}
      <div className="mt-5">{children}</div>
    </section>
  );
}

export function GemstoneForm({ initial }: { initial: Gemstone | null }) {
  const router = useRouter();
  const isNew = !initial;
  const [v, setV] = useState<Values>(() => fromGem(initial));
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [idTouched, setIdTouched] = useState(!isNew);
  const [paletteTouched, setPaletteTouched] = useState(Boolean(initial));
  const [uploading, setUploading] = useState(0);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const sessionUploads = useRef<Set<string>>(new Set());
  const fileInput = useRef<HTMLInputElement>(null);

  const set = (k: TextKey) => (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const value = e.target.value;
    setV((prev) => {
      const next = { ...prev, [k]: value };
      if (k === "name" && !idTouched) next.id = slugify(value);
      return next;
    });
  };

  function chooseType(slug: string) {
    setV((prev) => ({
      ...prev,
      type: slug,
      palette: paletteTouched ? prev.palette : (gemType(slug)?.palette ?? prev.palette),
    }));
  }

  async function onFiles(files: FileList | null) {
    if (!files?.length) return;
    setUploadError(null);
    const room = MAX_IMAGES - v.images.length;
    const list = Array.from(files).slice(0, Math.max(0, room));
    if (files.length > room) setUploadError(`Up to ${MAX_IMAGES} photos per gemstone.`);
    for (const file of list) {
      setUploading((n) => n + 1);
      try {
        const img = await uploadGemImage(file);
        sessionUploads.current.add(img.id);
        setV((prev) => ({ ...prev, images: [...prev.images, img] }));
      } catch (e) {
        setUploadError(e instanceof Error ? e.message : "Upload failed. Please try again.");
      } finally {
        setUploading((n) => n - 1);
      }
    }
    if (fileInput.current) fileInput.current.value = "";
  }

  function moveImage(index: number, delta: number) {
    setV((prev) => {
      const images = [...prev.images];
      const target = index + delta;
      if (target < 0 || target >= images.length) return prev;
      [images[index], images[target]] = [images[target], images[index]];
      return { ...prev, images };
    });
  }

  function removeImage(id: string) {
    setV((prev) => ({ ...prev, images: prev.images.filter((i) => i.id !== id) }));
    // Photos uploaded in this session and never saved can be removed right away.
    if (sessionUploads.current.has(id)) {
      sessionUploads.current.delete(id);
      void deleteGemImages([id]).catch(() => {});
    }
  }

  async function cancel() {
    const unsaved = [...sessionUploads.current];
    sessionUploads.current.clear();
    if (unsaved.length) void deleteGemImages(unsaved).catch(() => {});
    router.push("/admin/gemstones");
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (saving || uploading) return;
    setFormError(null);
    const parsed = gemstoneInputSchema.safeParse({
      ...v,
      variety: v.variety.trim() || gemType(v.type)?.label || "",
      price: num(v.price),
      carat: num(v.carat),
    });
    if (!parsed.success) {
      const errs: Record<string, string> = {};
      for (const issue of parsed.error.issues) {
        const key = String(issue.path[0] ?? "form");
        errs[key] ??= issue.message;
      }
      setErrors(errs);
      setFormError("Please check the highlighted fields.");
      document.querySelector("[aria-invalid='true'], [data-error='true']")?.scrollIntoView({ behavior: "smooth", block: "center" });
      return;
    }
    setErrors({});
    setSaving(true);
    try {
      if (isNew && (await gemstoneExists(parsed.data.id))) {
        setErrors({ id: "A gemstone with this ID already exists." });
        setFormError("Please choose a different ID.");
        return;
      }
      await saveGemstone(parsed.data, isNew);
      const removed = (initial?.images ?? []).filter((i) => !parsed.data.images.some((n) => n.id === i.id));
      if (removed.length) await deleteGemImages(removed.map((i) => i.id)).catch(() => {});
      sessionUploads.current.clear();
      router.push(`/admin/gemstones?saved=${encodeURIComponent(parsed.data.id)}`);
    } catch (err) {
      console.error(err);
      setFormError("Couldn't save the gemstone. Check your connection and that you're signed in as an admin.");
    } finally {
      setSaving(false);
    }
  }

  const err = (k: string) => (errors[k] ? <p className="field-error">{errors[k]}</p> : null);
  const input = (k: TextKey, label: string, props: React.InputHTMLAttributes<HTMLInputElement> = {}) => (
    <div>
      <label className="field-label" htmlFor={`g-${k}`}>{label}</label>
      <input
        id={`g-${k}`}
        className="field-input text-sm"
        value={v[k]}
        onChange={set(k)}
        aria-invalid={errors[k] ? true : undefined}
        {...props}
      />
      {err(k)}
    </div>
  );

  const type = gemType(v.type);
  const preview = {
    name: v.name || "Gemstone name",
    images: v.images,
    imageUrl: null,
    palette: v.palette,
    shape: v.shape || type?.signatureCut || "round",
  };

  return (
    <form onSubmit={submit} noValidate className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]">
      <div className="space-y-6">
        <Section title="1. Gemstone" hint="What kind of stone is it?">
          <ul className="grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-6" data-error={errors.type ? "true" : undefined}>
            {GEM_TYPES.map((t) => {
              const active = t.slug === v.type;
              return (
                <li key={t.slug}>
                  <button
                    type="button"
                    onClick={() => chooseType(t.slug)}
                    aria-pressed={active}
                    className={`flex w-full flex-col items-center gap-1 border px-1 py-2.5 text-xs transition ${
                      active ? "border-garnet bg-garnet-soft text-garnet" : "border-line hover:border-mist"
                    }`}
                  >
                    <GemArt shape={t.signatureCut} palette={t.palette} className="h-10 w-10" />
                    {t.label}
                  </button>
                </li>
              );
            })}
          </ul>
          {err("type")}
        </Section>

        <Section title="2. Cut" hint={type ? `Previewed in ${type.label.toLowerCase()} colours.` : "Choose a gemstone first to preview its colour."}>
          <ul className="grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-6" data-error={errors.shape ? "true" : undefined}>
            {CUTS.map((c) => {
              const active = c.slug === v.shape;
              return (
                <li key={c.slug}>
                  <button
                    type="button"
                    onClick={() => setV((p) => ({ ...p, shape: c.slug }))}
                    aria-pressed={active}
                    className={`flex w-full flex-col items-center gap-1 border px-1 py-2.5 text-xs transition ${
                      active ? "border-garnet bg-garnet-soft text-garnet" : "border-line hover:border-mist"
                    }`}
                  >
                    {type ? (
                      <GemArt shape={c.slug} palette={v.palette} className="h-10 w-10" />
                    ) : (
                      <GemArt shape={c.slug} mode="line" className="h-10 w-10 text-[#8a8790]" />
                    )}
                    {c.label}
                  </button>
                </li>
              );
            })}
          </ul>
          {err("shape")}
        </Section>

        <Section title="3. Name, ID & price">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">{input("name", "Name", { placeholder: "e.g. Royal Blue Sapphire", maxLength: 120 })}</div>
            <div>
              <label className="field-label" htmlFor="g-id">Stone ID</label>
              <input
                id="g-id"
                className="field-input font-mono text-sm"
                value={v.id}
                disabled={!isNew}
                onChange={(e) => {
                  setIdTouched(true);
                  setV((p) => ({ ...p, id: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "-").slice(0, 80) }));
                }}
                aria-invalid={errors.id ? true : undefined}
                placeholder="royal-blue-sapphire-308"
              />
              {err("id") ?? (
                <p className="mt-1 text-xs text-stone">
                  {isNew ? "Used in the web address. It can't be changed later." : "The ID can't be changed."}
                </p>
              )}
            </div>
            {input("variety", "Variety (optional)", { placeholder: type ? `e.g. Royal blue ${type.label.toLowerCase()}` : "e.g. Padparadscha" })}
            <div>
              <label className="field-label" htmlFor="g-price">Price</label>
              <div className="flex gap-2">
                <select
                  aria-label="Currency"
                  className="field-input w-24 text-sm"
                  value={v.currency}
                  onChange={set("currency")}
                >
                  {CURRENCIES.map((c) => (
                    <option key={c}>{c}</option>
                  ))}
                </select>
                <input
                  id="g-price"
                  inputMode="decimal"
                  className="field-input text-sm"
                  value={v.price}
                  onChange={set("price")}
                  placeholder="Leave empty for “Price on request”"
                  aria-invalid={errors.price ? true : undefined}
                />
              </div>
              {err("price")}
            </div>
            {input("carat", "Weight (ct)", { inputMode: "decimal", placeholder: "e.g. 3.08" })}
            <div>
              <label className="field-label" htmlFor="g-status">Availability</label>
              <select id="g-status" className="field-input text-sm" value={v.status} onChange={(e) => setV((p) => ({ ...p, status: e.target.value }))}>
                {GEMSTONE_STATUSES.map((s) => (
                  <option key={s} value={s}>{GEMSTONE_STATUS_LABELS[s]}</option>
                ))}
              </select>
            </div>
            <label className="flex items-center gap-2 self-end pb-2 text-sm text-ink">
              <input
                type="checkbox"
                checked={v.featured}
                onChange={(e) => setV((p) => ({ ...p, featured: e.target.checked }))}
                className="h-4 w-4 accent-garnet"
              />
              Feature on the home page
            </label>
          </div>
        </Section>

        <Section
          title="4. Photos"
          hint="Clear photos sell stones: daylight or a daylight lamp, a plain white or grey background, sharp focus. The first photo is the main one."
        >
          <ul className="grid grid-cols-3 gap-3 sm:grid-cols-4">
            {v.images.map((img, i) => (
              <li key={img.id} className="group relative aspect-square overflow-hidden border border-line bg-pearl">
                {/* eslint-disable-next-line @next/next/no-img-element -- uploaded thumbnails */}
                <img src={gemImageUrl(img, "sm")} alt={`Photo ${i + 1}`} className="h-full w-full object-cover" />
                {i === 0 && (
                  <span className="absolute top-1.5 left-1.5 bg-garnet px-1.5 py-0.5 text-[0.6rem] tracking-wider text-white uppercase">Main</span>
                )}
                <div className="absolute inset-x-0 bottom-0 flex justify-between bg-ink/70 p-1 text-white">
                  <button type="button" onClick={() => moveImage(i, -1)} disabled={i === 0} className="px-2 disabled:opacity-30" aria-label="Move earlier">←</button>
                  <button type="button" onClick={() => removeImage(img.id)} className="px-2 text-xs" aria-label={`Remove photo ${i + 1}`}>Remove</button>
                  <button type="button" onClick={() => moveImage(i, 1)} disabled={i === v.images.length - 1} className="px-2 disabled:opacity-30" aria-label="Move later">→</button>
                </div>
              </li>
            ))}
            {Array.from({ length: uploading }).map((_, i) => (
              <li key={`u${i}`} className="flex aspect-square items-center justify-center border border-line bg-pearl text-stone">
                <Spinner className="h-5 w-5" />
              </li>
            ))}
            {v.images.length + uploading < MAX_IMAGES && (
              <li>
                <label
                  className="flex aspect-square cursor-pointer flex-col items-center justify-center gap-1 border border-dashed border-mist text-center text-sm text-stone transition hover:border-garnet hover:text-garnet"
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => {
                    e.preventDefault();
                    void onFiles(e.dataTransfer.files);
                  }}
                >
                  <span className="text-2xl leading-none">+</span>
                  Add photos
                  <input
                    ref={fileInput}
                    type="file"
                    accept="image/jpeg,image/png,image/webp,image/heic,image/heif"
                    multiple
                    className="sr-only"
                    onChange={(e) => void onFiles(e.target.files)}
                  />
                </label>
              </li>
            )}
          </ul>
          {uploadError && <p className="field-error">{uploadError}</p>}
          {err("images")}
          <p className="mt-3 text-xs text-stone">Photos are resized and compressed automatically. Without photos, an illustration in the stone&apos;s cut and colours is shown.</p>
        </Section>

        <Section title="5. Specifications" hint="All optional. Shown on the gemstone page.">
          <div className="grid gap-4 sm:grid-cols-2">
            {input("color", "Colour", { placeholder: "e.g. Royal blue" })}
            {input("origin", "Origin", { placeholder: "e.g. Wollo, Ethiopia" })}
            {input("clarity", "Clarity", { placeholder: "e.g. Eye clean" })}
            {input("cut", "Cut details", { placeholder: `e.g. ${v.shape ? cutLabel(v.shape) : "Oval"} mixed cut` })}
            {input("treatment", "Treatment", { placeholder: "e.g. None / Heated" })}
            {input("dimensions", "Dimensions", { placeholder: "e.g. 9.4 × 7.6 × 5.1 mm" })}
            <div className="sm:col-span-2">{input("certificate", "Certificate", { placeholder: "e.g. GRS #2024-012345" })}</div>
          </div>
        </Section>

        <Section title="6. Description & review">
          <div className="space-y-4">
            <div>
              <label className="field-label" htmlFor="g-description">Description</label>
              <textarea id="g-description" className="field-input min-h-28 resize-y text-sm" value={v.description} onChange={set("description")} maxLength={5000} />
              {err("description")}
            </div>
            <div>
              <label className="field-label" htmlFor="g-review">Gemologist&apos;s review</label>
              <textarea
                id="g-review"
                className="field-input min-h-28 resize-y text-sm"
                value={v.review}
                onChange={set("review")}
                maxLength={5000}
                placeholder="Your expert assessment: colour, saturation, brilliance, inclusions, cut quality and what makes this stone special."
              />
              {err("review")}
            </div>
          </div>
        </Section>
      </div>

      <aside className="space-y-4 lg:sticky lg:top-24 lg:self-start">
        <div className="border border-line bg-white p-4">
          <p className="text-xs tracking-[0.14em] text-stone uppercase">Preview</p>
          <div className="mt-3 aspect-[4/5] overflow-hidden border border-line bg-pearl">
            <GemVisual gem={preview} size="sm" />
          </div>
          <p className="eyebrow mt-3">
            {(v.variety || type?.label) ?? "Gemstone"}
            {v.shape ? ` · ${cutLabel(v.shape)}` : ""}
          </p>
          <p className="mt-1 font-serif text-xl text-ink">{preview.name}</p>
          <p className="mt-1 text-sm text-ink">
            {formatPrice({ price: Number.isFinite(num(v.price)) ? num(v.price) : null, currency: v.currency })}
          </p>
          <div className="mt-4 border-t border-line pt-3">
            <p className="text-xs text-stone">Illustration colours (used when there are no photos)</p>
            <div className="mt-2 flex items-center gap-2">
              {[0, 1].map((i) => (
                <input
                  key={i}
                  type="color"
                  aria-label={i === 0 ? "Deep colour" : "Light colour"}
                  value={v.palette[i]}
                  onChange={(e) => {
                    setPaletteTouched(true);
                    const palette = [...v.palette] as [string, string];
                    palette[i] = e.target.value;
                    setV((p) => ({ ...p, palette }));
                  }}
                  className="h-8 w-10 cursor-pointer border border-line bg-white p-0.5"
                />
              ))}
              {type && (
                <button
                  type="button"
                  className="text-xs text-garnet hover:underline"
                  onClick={() => {
                    setPaletteTouched(false);
                    setV((p) => ({ ...p, palette: type.palette }));
                  }}
                >
                  Reset
                </button>
              )}
            </div>
          </div>
        </div>

        {formError && (
          <p role="alert" className="border border-danger/30 bg-danger-soft px-4 py-3 text-sm text-danger">
            {formError}
          </p>
        )}
        <div className="flex gap-2">
          <button type="submit" className="btn btn-primary flex-1" disabled={saving || uploading > 0}>
            {saving && <Spinner className="h-4 w-4" />}
            {uploading > 0 ? "Uploading…" : isNew ? "Add gemstone" : "Save changes"}
          </button>
          <button type="button" className="btn btn-outline" onClick={() => void cancel()} disabled={saving}>
            Cancel
          </button>
        </div>
        {!isNew && (
          <Link href={`/gemstones/${initial.id}`} target="_blank" className="block text-center text-sm text-garnet hover:underline">
            View on the website ↗
          </Link>
        )}
      </aside>
    </form>
  );
}
