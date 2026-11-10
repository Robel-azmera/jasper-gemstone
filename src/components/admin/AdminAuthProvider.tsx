"use client";

import { onIdTokenChanged, signOut as fbSignOut, type User } from "firebase/auth";
import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { clientAuth, isFirebaseClientConfigured } from "@/lib/firebase/client";

type AuthState =
  | { status: "loading" }
  | { status: "unconfigured" }
  | { status: "signed-out" }
  | { status: "forbidden"; user: User }
  | { status: "admin"; user: User };

interface AuthContextValue {
  state: AuthState;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

/**
 * Tracks the Firebase user and whether their ID token carries the `admin`
 * custom claim (set with `npm run set-admin`). Firestore rules enforce the
 * same claim server-side, so this is only for UX.
 */
export function AdminAuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>(() =>
    isFirebaseClientConfigured ? { status: "loading" } : { status: "unconfigured" },
  );

  useEffect(() => {
    if (!isFirebaseClientConfigured) return;
    return onIdTokenChanged(clientAuth(), async (user) => {
      if (!user) {
        setState({ status: "signed-out" });
        return;
      }
      const token = await user.getIdTokenResult();
      setState(token.claims.admin === true ? { status: "admin", user } : { status: "forbidden", user });
    });
  }, []);

  const value: AuthContextValue = {
    state,
    signOut: () => fbSignOut(clientAuth()),
  };
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAdminAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAdminAuth must be used inside AdminAuthProvider");
  return ctx;
}

export function useAdminUser(): User {
  const { state } = useAdminAuth();
  if (state.status !== "admin") throw new Error("Not an admin");
  return state.user;
}
