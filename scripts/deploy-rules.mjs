// Deploy firestore.rules using the service account (no Firebase CLI login needed).
//   npm run deploy:rules:sa
import { readFile } from "node:fs/promises";
import { getSecurityRules } from "firebase-admin/security-rules";
import { initAdmin } from "./_admin.mjs";

initAdmin();
const source = await readFile(new URL("../firestore.rules", import.meta.url), "utf8");
const ruleset = await getSecurityRules().releaseFirestoreRulesetFromSource(source);
console.log(`Deployed Firestore rules (${ruleset.name}).`);
