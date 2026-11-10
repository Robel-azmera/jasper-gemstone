"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import {
  CONFIRMATION_MESSAGE,
  CONSULTATION_CONFIRMATION_MESSAGE,
} from "@/lib/bookings/constants";

interface Props {
  referenceNumber: string;
  mode: "gemstone" | "consultation";
  gemstoneName?: string;
  onClose?: () => void;
  onAnother: () => void;
}

export function BookingConfirmation({ referenceNumber, mode, gemstoneName, onClose, onAnother }: Props) {
  const [copied, setCopied] = useState(false);
  const headingRef = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    headingRef.current?.focus();
  }, []);

  async function copy() {
    try {
      await navigator.clipboard.writeText(referenceNumber);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* clipboard unavailable – the number is still visible */
    }
  }

  return (
    <div className="animate-rise-in py-2 text-center" aria-live="polite">
      <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full border border-garnet/30 bg-garnet-soft">
        <svg viewBox="0 0 24 24" className="h-7 w-7 text-garnet" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden>
          <path d="M5 12.5l4.2 4.2L19 7" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </div>
      <p className="eyebrow mt-6">Request received</p>
      <h3 ref={headingRef} tabIndex={-1} className="mt-2 font-serif text-3xl text-ink outline-none">
        Thank you
      </h3>
      <p className="mx-auto mt-3 max-w-md leading-relaxed text-stone">
        {mode === "gemstone" ? CONFIRMATION_MESSAGE : CONSULTATION_CONFIRMATION_MESSAGE}
      </p>

      <div className="mx-auto mt-8 max-w-sm border border-line bg-white px-6 py-5">
        <p className="field-label mb-1">Your booking reference</p>
        <p className="font-mono text-2xl tracking-wider text-garnet select-all">{referenceNumber}</p>
        <button type="button" onClick={copy} className="mt-2 text-xs tracking-widest text-stone uppercase hover:text-garnet">
          {copied ? "Copied" : "Copy reference"}
        </button>
        {gemstoneName && <p className="mt-3 border-t border-line pt-3 text-sm text-stone">{gemstoneName}</p>}
      </div>

      <div className="mx-auto mt-6 max-w-md text-left text-sm text-stone">
        <p className="mb-2 font-medium text-ink">What happens next</p>
        <ol className="list-decimal space-y-1 pl-5">
          <li>Our team reviews your request and checks availability.</li>
          <li>We contact you using your preferred method to confirm the details.</li>
          <li>Please keep your reference number for any follow-up.</li>
        </ol>
        <p className="mt-3 text-xs text-mist">
          Your request is not yet a confirmed reservation; availability is not guaranteed until our team confirms it.
        </p>
      </div>

      <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
        {onClose ? (
          <button type="button" className="btn btn-primary" onClick={onClose}>
            Done
          </button>
        ) : (
          <Link href="/gemstones" className="btn btn-primary">
            Explore the collection
          </Link>
        )}
        <button type="button" className="btn btn-outline" onClick={onAnother}>
          New request
        </button>
      </div>
    </div>
  );
}
