"use client";

// Admin-side Firestore helpers for the gemstone catalogue. Writes are allowed
// by firestore.rules only for users with the `admin` custom claim.
import {
  Bytes,
  collection,
  deleteDoc,
  doc,
  getDoc,
  onSnapshot,
  serverTimestamp,
  setDoc,
  writeBatch,
} from "firebase/firestore";
import { clientDb } from "@/lib/firebase/client";
import { normalizeGemstone } from "./normalize";
import type { GemImage, Gemstone } from "./types";
import type { GemstoneInput } from "./validation";

const GEMSTONES = "gemstones";
const IMAGES = "gemstoneImages";

export function subscribeGemstones(onData: (gems: Gemstone[]) => void, onError: (e: Error) => void) {
  return onSnapshot(
    collection(clientDb(), GEMSTONES),
    (snap) =>
      onData(
        snap.docs
          .map((d) => normalizeGemstone(d.id, d.data()))
          .sort((a, b) => b.createdAt - a.createdAt || a.name.localeCompare(b.name)),
      ),
    onError,
  );
}

export async function fetchGemstone(id: string): Promise<Gemstone | null> {
  const snap = await getDoc(doc(clientDb(), GEMSTONES, id));
  return snap.exists() ? normalizeGemstone(snap.id, snap.data()) : null;
}

export async function gemstoneExists(id: string): Promise<boolean> {
  return (await getDoc(doc(clientDb(), GEMSTONES, id))).exists();
}

export async function saveGemstone(input: GemstoneInput, isNew: boolean): Promise<void> {
  const { id, ...data } = input;
  const ref = doc(clientDb(), GEMSTONES, id);
  const payload = {
    ...data,
    imageUrl: null,
    updatedAt: serverTimestamp(),
    ...(isNew ? { createdAt: serverTimestamp() } : {}),
  };
  await setDoc(ref, payload, { merge: !isNew });
}

export async function deleteGemImages(ids: string[]): Promise<void> {
  if (!ids.length) return;
  const batch = writeBatch(clientDb());
  for (const id of ids) {
    batch.delete(doc(clientDb(), IMAGES, id));
    batch.delete(doc(clientDb(), IMAGES, `${id}-sm`));
  }
  await batch.commit();
}

export async function deleteGemstone(gem: Pick<Gemstone, "id" | "images">): Promise<void> {
  await deleteGemImages(gem.images.map((i) => i.id));
  await deleteDoc(doc(clientDb(), GEMSTONES, gem.id));
}

// ---------------------------------------------------------------------------
// Photo upload: photos are resized and compressed in the browser, then stored
// as bytes in Firestore (max ~1 MB per document) and served by /images/gems.

const LARGE = { max: 1600, budget: 900_000 };
const SMALL = { max: 640, budget: 180_000 };

function randomId(len = 20): string {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789";
  const bytes = crypto.getRandomValues(new Uint8Array(len));
  return Array.from(bytes, (b) => alphabet[b % alphabet.length]).join("");
}

function toBlob(canvas: HTMLCanvasElement, type: string, quality: number): Promise<Blob | null> {
  return new Promise((resolve) => canvas.toBlob(resolve, type, quality));
}

async function encode(bitmap: ImageBitmap, { max, budget }: { max: number; budget: number }) {
  let scale = Math.min(1, max / Math.max(bitmap.width, bitmap.height));
  for (let attempt = 0; attempt < 6; attempt++) {
    const w = Math.max(1, Math.round(bitmap.width * scale));
    const h = Math.max(1, Math.round(bitmap.height * scale));
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Your browser can't process images.");
    ctx.imageSmoothingQuality = "high";
    ctx.drawImage(bitmap, 0, 0, w, h);
    for (const quality of [0.88, 0.8, 0.7, 0.6]) {
      let blob = await toBlob(canvas, "image/webp", quality);
      if (!blob || blob.type !== "image/webp") blob = await toBlob(canvas, "image/jpeg", quality);
      if (blob && blob.size <= budget) return { blob, w, h };
    }
    scale *= 0.8;
  }
  throw new Error("This photo is too large to compress. Try a smaller image.");
}

async function bytesOf(blob: Blob) {
  return Bytes.fromUint8Array(new Uint8Array(await blob.arrayBuffer()));
}

export async function uploadGemImage(file: File): Promise<GemImage> {
  if (!file.type.startsWith("image/")) throw new Error(`${file.name} is not an image.`);
  if (file.size > 40 * 1024 * 1024) throw new Error(`${file.name} is larger than 40 MB.`);
  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
  } catch {
    throw new Error(`${file.name} couldn't be read. Use a JPG, PNG or WebP photo.`);
  }
  try {
    const [lg, sm] = [await encode(bitmap, LARGE), await encode(bitmap, SMALL)];
    const id = randomId();
    const batch = writeBatch(clientDb());
    batch.set(doc(clientDb(), IMAGES, id), {
      data: await bytesOf(lg.blob),
      contentType: lg.blob.type,
      w: lg.w,
      h: lg.h,
      createdAt: serverTimestamp(),
    });
    batch.set(doc(clientDb(), IMAGES, `${id}-sm`), {
      data: await bytesOf(sm.blob),
      contentType: sm.blob.type,
      w: sm.w,
      h: sm.h,
      createdAt: serverTimestamp(),
    });
    await batch.commit();
    return { id, w: lg.w, h: lg.h };
  } finally {
    bitmap.close();
  }
}
