import { adminDb, isAdminConfigured } from "@/lib/firebase/admin";
import { GEM_IMAGES_COLLECTION } from "@/lib/gemstones/server";

// Serves gemstone photos stored in Firestore (`gemstoneImages/{id}`).
// Image ids are random and their contents never change, so responses can be
// cached forever by browsers and the Vercel CDN.
const ALLOWED_TYPES = new Set(["image/webp", "image/jpeg", "image/png"]);

export async function GET(_req: Request, ctx: RouteContext<"/images/gems/[file]">) {
  const { file } = await ctx.params;
  if (!/^[A-Za-z0-9_-]{8,64}(-sm)?$/.test(file) || !isAdminConfigured()) {
    return new Response("Not found", { status: 404 });
  }
  const snap = await adminDb().collection(GEM_IMAGES_COLLECTION).doc(file).get();
  const data = snap.data() as { data?: Buffer | Uint8Array; contentType?: string } | undefined;
  if (!data?.data || !data.contentType || !ALLOWED_TYPES.has(data.contentType)) {
    return new Response("Not found", { status: 404, headers: { "Cache-Control": "public, max-age=60" } });
  }
  return new Response(new Uint8Array(data.data), {
    headers: {
      "Content-Type": data.contentType,
      "Cache-Control": "public, max-age=31536000, immutable",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
