"use client";

import Link from "next/link";
import { useBookings } from "@/components/admin/BookingsProvider";
import { RecentActivity } from "@/components/admin/RecentActivity";
import { StatCard, StatusBadge, UnreadDot, WarningIcon } from "@/components/admin/ui";
import { BOOKING_TYPE_LABELS } from "@/lib/bookings/constants";
import { formatPreferred, timeAgo } from "@/lib/bookings/format";

export default function AdminDashboardPage() {
  const { bookings, counts, unread, loading, error, gemstoneIssue } = useBookings();
  const pending = bookings.filter((b) => b.status === "Pending");
  const flagged = bookings.filter((b) => gemstoneIssue(b));

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="eyebrow">Overview</p>
          <h1 className="mt-1 font-serif text-4xl text-ink">Dashboard</h1>
        </div>
        <p className="flex items-center gap-2 text-xs text-stone">
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-success opacity-60" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-success" />
          </span>
          Live — updates automatically
        </p>
      </div>

      {error && <div className="border border-danger/30 bg-danger-soft p-4 text-sm text-danger">{error}</div>}

      <section aria-label="Booking statistics" className="grid grid-cols-2 gap-3 md:grid-cols-5">
        <StatCard label="Total" value={loading ? "–" : counts.Total} />
        <StatCard
          label="Pending"
          value={loading ? "–" : counts.Pending}
          tone={counts.Pending ? "attention" : "default"}
          hint={counts.Pending ? "Needs your attention" : "All handled"}
        />
        <StatCard label="Confirmed" value={loading ? "–" : counts.Confirmed} tone="info" />
        <StatCard label="Completed" value={loading ? "–" : counts.Completed} tone="success" />
        <StatCard label="Cancelled" value={loading ? "–" : counts.Cancelled} tone="muted" />
      </section>

      {flagged.length > 0 && (
        <section className="border border-warning/40 bg-warning-soft p-4 text-sm text-warning">
          <p className="flex items-center gap-2 font-medium">
            <WarningIcon /> {flagged.length} active booking{flagged.length === 1 ? "" : "s"} for gemstones that are no
            longer available
          </p>
          <ul className="mt-2 space-y-1">
            {flagged.slice(0, 5).map((b) => (
              <li key={b.bookingId}>
                <Link href={`/admin/bookings?open=${b.bookingId}`} className="underline-offset-2 hover:underline">
                  {b.referenceNumber} · {b.customerName} · {b.gemstoneName}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      <div className="grid gap-8 lg:grid-cols-3">
        <section className="border border-line bg-white lg:col-span-2">
          <div className="flex items-center justify-between border-b border-line px-5 py-4">
            <h2 className="font-serif text-2xl text-ink">
              Awaiting response{" "}
              {pending.length > 0 && <span className="text-base text-warning">({pending.length})</span>}
            </h2>
            <Link href="/admin/bookings?status=Pending" className="text-xs tracking-widest text-garnet uppercase">
              View all
            </Link>
          </div>
          {loading ? (
            <p className="p-5 text-sm text-stone">Loading…</p>
          ) : pending.length === 0 ? (
            <p className="p-8 text-center text-sm text-stone">No pending bookings. Everything is handled.</p>
          ) : (
            <ul className="divide-y divide-line">
              {pending.slice(0, 8).map((b) => (
                <li key={b.bookingId}>
                  <Link
                    href={`/admin/bookings?open=${b.bookingId}`}
                    className={`flex flex-wrap items-center gap-x-4 gap-y-1 border-l-4 px-5 py-3 transition hover:bg-pearl ${
                      b.read ? "border-warning/40" : "border-garnet bg-garnet-soft/40"
                    }`}
                  >
                    {!b.read && <UnreadDot />}
                    <span className="min-w-0 flex-1">
                      <span className={`block truncate text-sm ${b.read ? "text-ink" : "font-medium text-ink"}`}>
                        {b.customerName}
                        <span className="ml-2 font-mono text-xs font-normal text-mist">{b.referenceNumber}</span>
                      </span>
                      <span className="block truncate text-xs text-stone">
                        {b.gemstoneName ?? BOOKING_TYPE_LABELS[b.bookingType]} ·{" "}
                        {formatPreferred(b.preferredDate, b.preferredTime)}
                      </span>
                    </span>
                    {gemstoneIssue(b) && (
                      <span className="text-warning" title={gemstoneIssue(b) ?? ""}>
                        <WarningIcon />
                      </span>
                    )}
                    <span className="text-xs text-mist">{timeAgo(b.createdAt)}</span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="border border-line bg-white">
          <div className="border-b border-line px-5 py-4">
            <h2 className="font-serif text-2xl text-ink">Recent activity</h2>
          </div>
          <div className="max-h-[32rem] overflow-y-auto p-5">
            <RecentActivity />
          </div>
        </section>
      </div>

      <section className="border border-line bg-white">
        <div className="flex items-center justify-between border-b border-line px-5 py-4">
          <h2 className="font-serif text-2xl text-ink">Latest bookings</h2>
          <span className="text-xs text-stone">{unread.length} unread</span>
        </div>
        <ul className="divide-y divide-line">
          {bookings.slice(0, 6).map((b) => (
            <li key={b.bookingId}>
              <Link
                href={`/admin/bookings?open=${b.bookingId}`}
                className="flex items-center gap-4 px-5 py-3 text-sm transition hover:bg-pearl"
              >
                {!b.read ? <UnreadDot /> : <span className="w-2" />}
                <span className="min-w-0 flex-1 truncate">
                  {b.customerName} <span className="text-stone">· {b.gemstoneName ?? BOOKING_TYPE_LABELS[b.bookingType]}</span>
                </span>
                <StatusBadge status={b.status} />
                <span className="hidden w-20 text-right text-xs text-mist sm:block">{timeAgo(b.createdAt)}</span>
              </Link>
            </li>
          ))}
          {!loading && bookings.length === 0 && (
            <li className="p-8 text-center text-sm text-stone">No bookings yet.</li>
          )}
        </ul>
      </section>
    </div>
  );
}
