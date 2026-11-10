// Shared Firebase Admin initialisation for CLI scripts.
// Run scripts with: node --env-file=.env.local scripts/<name>.mjs
import { cert, getApps, initializeApp } from "firebase-admin/app";

export function initAdmin() {
  if (getApps().length) return getApps()[0];
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT_KEY?.trim();
  if (raw) {
    const sa = JSON.parse(raw.startsWith("{") ? raw : Buffer.from(raw, "base64").toString("utf8"));
    return initializeApp({ credential: cert(sa), projectId: sa.project_id });
  }
  const { FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY } = process.env;
  if (FIREBASE_PROJECT_ID && FIREBASE_CLIENT_EMAIL && FIREBASE_PRIVATE_KEY) {
    return initializeApp({
      credential: cert({
        projectId: FIREBASE_PROJECT_ID,
        clientEmail: FIREBASE_CLIENT_EMAIL,
        privateKey: FIREBASE_PRIVATE_KEY.replace(/\\n/g, "\n"),
      }),
      projectId: FIREBASE_PROJECT_ID,
    });
  }
  return initializeApp(); // Application Default Credentials
}
