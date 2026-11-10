"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { subscribeRecentActivity } from "@/lib/bookings/client";
import { formatDateTime, timeAgo } from "@/lib/bookings/format";
import type { BookingHistoryEntry } from "@/lib/bookings/types";
import { useBookings } from "./BookingsProvider";

const ICONS: Record<BookingHistoryEntry["type"], string> = {
  created: "bg-garnet",
  status_changed: "bg-info",
  notes_updated: "bg-gold",
  details_edited: "bg-stone",
  marked_read: "bg-mist",
};

export function RecentActivity() {
  const { byId } = useBookings();
  const [items, setItems] = useState<BookingHistoryEntry[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(
    () =>
      subscribeRecentActivity(setItems, (e) => {
        console.warn("[admin] activity listener failed", e);
        setError("Recent activity is unavailable (check the Firestore index for 'history').");
      }),
    [],
  );

  if (error) return <p className="text-sm text-stone">{error}</p>;
  if (!items) return <p className="text-sm text-stone">Loading activity…</p>;
  if (!items.length) return <p className="text-sm text-stone">No activity yet.</p>;

  return (
    <ol className="space-y-4">
      {items.map((h) => {
        const b = byId.get(h.bookingId);
        return (
          <li key={`${h.bookingId}-${h.id}`} className="flex gap-3">
            <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${ICONS[h.type] ?? "bg-mist"}`} aria-hidden />
            <div className="min-w-0 flex-1 text-sm">
              <p className="text-ink">
                {b ? (
                  <Link href={`/admin/bookings?open=${h.bookingId}`} className="font-medium hover:text-garnet">
                    {b.customerName}
                  </Link>
                ) : (
                  <span className="font-medium text-stone">Deleted booking</span>
                )}
                {b && <span className="ml-2 font-mono text-xs text-mist">{b.referenceNumber}</span>}
              </p>
              <p className="text-stone">{h.summary}</p>
              <p className="text-xs text-mist" title={formatDateTime(h.at)}>
                {timeAgo(h.at)}
                {h.actorEmail ? ` · ${h.actorEmail}` : ""}
              </p>
            </div>
          </li>
        );
      })}
    </ol>
  );
}
