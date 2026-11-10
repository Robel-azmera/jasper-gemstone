"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { GemstoneForm } from "@/components/admin/GemstoneForm";
import { Spinner } from "@/components/booking/Spinner";
import { fetchGemstone } from "@/lib/gemstones/client";
import type { Gemstone } from "@/lib/gemstones/types";

type Load = { status: "loading" } | { status: "ready"; gem: Gemstone | null } | { status: "missing" } | { status: "error" };

function Editor() {
  const id = useSearchParams().get("id");
  const [load, setLoad] = useState<Load>(id ? { status: "loading" } : { status: "ready", gem: null });

  useEffect(() => {
    if (!id) return;
    let live = true;
    fetchGemstone(id)
      .then((gem) => live && setLoad(gem ? { status: "ready", gem } : { status: "missing" }))
      .catch(() => live && setLoad({ status: "error" }));
    return () => {
      live = false;
    };
  }, [id]);

  return (
    <div>
      <nav className="mb-4 text-sm text-stone">
        <Link href="/admin/gemstones" className="hover:text-garnet">← Gemstones</Link>
      </nav>
      <h1 className="mb-6 font-serif text-4xl text-ink">
        {id ? (load.status === "ready" && load.gem ? `Edit ${load.gem.name}` : "Edit gemstone") : "Add a gemstone"}
      </h1>
      {load.status === "loading" && (
        <div className="flex justify-center py-20 text-stone"><Spinner className="h-6 w-6" /></div>
      )}
      {load.status === "missing" && <p className="text-stone">This gemstone no longer exists.</p>}
      {load.status === "error" && <p className="text-danger">Couldn&apos;t load this gemstone. Please refresh.</p>}
      {load.status === "ready" && <GemstoneForm key={id ?? "new"} initial={load.gem} />}
    </div>
  );
}

export default function EditGemstonePage() {
  return (
    <Suspense fallback={<div className="flex justify-center py-20 text-stone"><Spinner className="h-6 w-6" /></div>}>
      <Editor />
    </Suspense>
  );
}
