import "server-only";

import { cert, getApp, getApps, initializeApp, type App } from "firebase-admin/app";
import { getFirestore, type Firestore } from "firebase-admin/firestore";

/**
 * Firebase Admin SDK (server only). Bypasses security rules, so it must never
 * be imported from client components.
 *
 * Credentials, in order of preference:
 *  1. FIREBASE_SERVICE_ACCOUNT_KEY – the full service-account JSON (single line
 *     or base64-encoded).
 *  2. FIREBASE_PROJECT_ID + FIREBASE_CLIENT_EMAIL + FIREBASE_PRIVATE_KEY.
 *  3. Application Default Credentials (e.g. on Google Cloud / Firebase App Hosting).
 */
function readServiceAccount():
  | { projectId: string; clientEmail: string; privateKey: string }
  | null {
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT_KEY?.trim();
  if (raw) {
    let parsed: { project_id: string; client_email: string; private_key: string };
    try {
      const json = raw.startsWith("{") ? raw : Buffer.from(raw, "base64").toString("utf8");
      parsed = JSON.parse(json);
    } catch {
      throw new Error(
        "FIREBASE_SERVICE_ACCOUNT_KEY is not valid JSON or base64-encoded JSON. Re-copy the full value.",
      );
    }
    return {
      projectId: parsed.project_id,
      clientEmail: parsed.client_email,
      privateKey: parsed.private_key,
    };
  }
  const { FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY } = process.env;
  if (FIREBASE_PROJECT_ID && FIREBASE_CLIENT_EMAIL && FIREBASE_PRIVATE_KEY) {
    return {
      projectId: FIREBASE_PROJECT_ID,
      clientEmail: FIREBASE_CLIENT_EMAIL,
      privateKey: FIREBASE_PRIVATE_KEY.replace(/\\n/g, "\n"),
    };
  }
  return null;
}

export function isAdminConfigured(): boolean {
  return Boolean(
    process.env.FIREBASE_SERVICE_ACCOUNT_KEY ||
      (process.env.FIREBASE_PROJECT_ID &&
        process.env.FIREBASE_CLIENT_EMAIL &&
        process.env.FIREBASE_PRIVATE_KEY) ||
      process.env.FIREBASE_USE_ADC === "true",
  );
}

function adminApp(): App {
  if (getApps().length) return getApp();
  const sa = readServiceAccount();
  return sa
    ? initializeApp({ credential: cert(sa), projectId: sa.projectId })
    : initializeApp(); // Application Default Credentials
}

let db: Firestore | null = null;

export function adminDb(): Firestore {
  if (!db) db = getFirestore(adminApp());
  return db;
}
