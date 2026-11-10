// Seed the `gemstones` collection with the demo catalogue.
//   npm run seed
import { readFile } from "node:fs/promises";
import { getFirestore } from "firebase-admin/firestore";
import { initAdmin } from "./_admin.mjs";

initAdmin();
const db = getFirestore();
const gems = JSON.parse(await readFile(new URL("../src/data/demo-gemstones.json", import.meta.url), "utf8"));

const batch = db.batch();
for (const { id, ...data } of gems) {
  batch.set(db.collection("gemstones").doc(id), data, { merge: true });
}
await batch.commit();
console.log(`Seeded ${gems.length} gemstones.`);
