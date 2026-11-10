"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { setRead } from "@/lib/bookings/client";
import { BOOKING_TYPE_LABELS } from "@/lib/bookings/constants";
import { timeAgo } from "@/lib/bookings/format";
import { useBookings } from "./BookingsProvider";
import { UnreadDot } from "./ui";

export function NotificationBell() {
  const { unread } = useBookings();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  async function markAll() {
    setBusy(true);
    try {
      await setRead(unread.map((b) => b.bookingId), true);
    } finally {
      setBusy(false);
    }
  }

  const count = unread.length;
  return (
    <div ref={wrapRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="relative rounded-full p-2 text-ink transition hover:bg-pearl"
        aria-label={count ? `${count} unread booking${count === 1 ? "" : "s"}` : "No unread bookings"}
        aria-expanded={open}
      >
        <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden>
          <path d="M6 8a6 6 0 1112 0c0 7 3 9 3 9H3s3-2 3-9M10.3 21a1.94 1.94 0 003.4 0" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        {count > 0 && (
          <span className="absolute -top-0.5 -right-0.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-garnet px-1 text-[0.68rem] font-medium text-white ring-2 ring-ivory">
            {count > 99 ? "99+" : count}
          </span>
        )}
      </button>

      {open && (
        <div className="animate-fade-in absolute right-0 z-40 mt-2 w-[min(92vw,22rem)] border border-line bg-white shadow-xl">
          <div className="flex items-center justify-between border-b border-line px-4 py-3">
            <p className="text-sm font-medium text-ink">New bookings</p>
            {count > 0 && (
              <button
                type="button"
                onClick={markAll}
                disabled={busy}
                className="text-xs text-garnet hover:underline disabled:opacity-50"
              >
                Mark all as read
              </button>
            )}
          </div>
          {count === 0 ? (
            <p className="px-4 py-8 text-center text-sm text-stone">You&apos;re all caught up.</p>
          ) : (
            <ul className="max-h-96 divide-y divide-line overflow-y-auto">
              {unread.slice(0, 20).map((b) => (
                <li key={b.bookingId}>
                  <Link
                    href={`/admin/bookings?open=${b.bookingId}`}
                    onClick={() => setOpen(false)}
                    className="flex gap-3 px-4 py-3 transition hover:bg-pearl"
                  >
                    <UnreadDot className="mt-1.5" />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm text-ink">{b.customerName}</span>
                      <span className="block truncate text-xs text-stone">
                        {b.gemstoneName ?? BOOKING_TYPE_LABELS[b.bookingType]}
                      </span>
                    </span>
                    <span className="shrink-0 text-xs text-mist">{timeAgo(b.createdAt)}</span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
          <Link
            href="/admin/bookings?filter=unread"
            onClick={() => setOpen(false)}
            className="block border-t border-line px-4 py-2.5 text-center text-xs tracking-widest text-stone uppercase hover:text-garnet"
          >
            View all bookings
          </Link>
        </div>
      )}
    </div>
  );
}
