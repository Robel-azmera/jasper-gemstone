"use client";

import { signInWithEmailAndPassword } from "firebase/auth";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";
import { useAdminAuth } from "@/components/admin/AdminAuthProvider";
import { Spinner } from "@/components/booking/Spinner";
import { clientAuth } from "@/lib/firebase/client";
import logo from "../../../../public/brand/jasper-logo.jpg";

export default function AdminLoginPage() {
  const { state, signOut } = useAdminAuth();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (state.status === "admin") router.replace("/admin");
  }, [state.status, router]);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await signInWithEmailAndPassword(clientAuth(), email.trim(), password);
    } catch {
      setError("Incorrect email or password.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex min-h-dvh items-center justify-center bg-pearl px-4">
      <div className="w-full max-w-sm border border-line bg-white p-8 shadow-sm">
        <Image src={logo} alt="Jasper Gemstone" className="mx-auto h-20 w-auto mix-blend-multiply" priority />
        <h1 className="mt-6 text-center font-serif text-3xl text-ink">Administration</h1>

        {state.status === "unconfigured" ? (
          <p className="mt-6 text-sm text-danger">
            Firebase is not configured. Add the <code>NEXT_PUBLIC_FIREBASE_*</code> values to{" "}
            <code>.env.local</code> and restart the server.
          </p>
        ) : state.status === "forbidden" ? (
          <div className="mt-6 text-center text-sm text-stone">
            <p>
              <strong className="text-ink">{state.user.email}</strong> is signed in but is not an
              administrator.
            </p>
            <button type="button" className="btn btn-outline btn-sm mt-4" onClick={signOut}>
              Sign out
            </button>
          </div>
        ) : (
          <form onSubmit={onSubmit} className="mt-6 space-y-4">
            <div>
              <label htmlFor="email" className="field-label">Email</label>
              <input
                id="email"
                type="email"
                autoComplete="username"
                className="field-input"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div>
              <label htmlFor="password" className="field-label">Password</label>
              <input
                id="password"
                type="password"
                autoComplete="current-password"
                className="field-input"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
            {error && <p className="field-error" role="alert">{error}</p>}
            <button type="submit" className="btn btn-primary w-full" disabled={busy || state.status === "loading"}>
              {busy && <Spinner />} Sign in
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
