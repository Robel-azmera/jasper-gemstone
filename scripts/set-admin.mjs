// Grant (or revoke) the `admin` custom claim used by Firestore rules.
//   npm run set-admin -- owner@example.com
//   npm run set-admin -- owner@example.com --revoke
import { getAuth } from "firebase-admin/auth";
import { initAdmin } from "./_admin.mjs";

const [email, flag] = process.argv.slice(2);
if (!email) {
  console.error("Usage: npm run set-admin -- <email> [--revoke]");
  process.exit(1);
}

initAdmin();
const auth = getAuth();
const user = await auth.getUserByEmail(email);
const admin = flag !== "--revoke";
await auth.setCustomUserClaims(user.uid, { ...(user.customClaims ?? {}), admin });
console.log(`${admin ? "Granted" : "Revoked"} admin for ${email} (${user.uid}).`);
console.log("The user must sign out and back in (or wait up to 1h) for the change to apply.");
