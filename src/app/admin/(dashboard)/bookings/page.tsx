"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Suspense, useCallback, useMemo, useState } from "react";
import { BookingDrawer } from "@/components/admin/BookingDrawer";
import { useBookings } from "@/components/admin/BookingsProvider";
import { StatusBadge, UnreadDot, WarningIcon } from "@/components/admin/ui";
import { setRead } from "@/lib/bookings/client";
import { BOOKING_STATUSES, BOOKING_TYPE_LABELS } from "@/lib/bookings/constants";
import { formatDateTime, formatPreferred, localDay, timeAgo } from "@/lib/bookings/format";
import { phoneDigits } from "@/lib/bookings/sanitize";
import type { Booking } from "@/lib/bookings/types";

type DateField = "createdAt" | "preferredDate";

function matchesSearch(b: Booking, q: string): boolean {
  if (!q) return true;
  const needle = q.toLowerCase();
  const digits = phoneDigits(q);
  return (
    b.customerName.toLowerCase().includes(needle) ||
    b.referenceNumber.toLowerCase().includes(needle) ||
    b.email.toLowerCase().includes(needle) ||
    (digits.length >= 3 && phoneDigits(b.phoneNumber).includes(digits))
  );
}

function BookingsView() {
  const { bookings, loading, error, unread, gemstoneIssue, byId } = useBookings();
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();

  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<string>(params.get("status") ?? (params.get("filter") === "unread" ? "unread" : "all"));
  const [dateField, setDateField] = useState<DateField>("createdAt");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");

  const openId = params.get("open");
  const setOpen = useCallback(
    (id: string | null) => {
      const next = new URLSearchParams(params.toString());
      if (id) next.set("open", id);
      else next.delete("open");
      const qs = next.toString();
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    },
    [params, pathname, router],
  );
  const close = useCallback(() => setOpen(null), [setOpen]);

  const filtered = useMemo(() => {
    return bookings.filter((b) => {
      if (status === "unread" && b.read) return false;
      if (status !== "all" && status !== "unread" && b.status !== status) return false;
      if (!matchesSearch(b, search.trim())) return false;
      if (from || to) {
        const day = dateField === "createdAt" ? (b.createdAt ? localDay(b.createdAt) : null) : b.preferredDate;
        if (!day) return false;
        if (from && day < from) return false;
        if (to && day > to) return false;
      }
      return true;
    });
  }, [bookings, status, search, dateField, from, to]);

  const hasFilters = search || status !== "all" || from || to;
  const selected = openId ? (byId.get(openId) ?? null) : null;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="eyebrow">Management</p>
          <h1 className="mt-1 font-serif text-4xl text-ink">Bookings</h1>
        </div>
        {unread.length > 0 && (
          <button
            type="button"
            className="btn btn-outline btn-sm"
            onClick={() => setRead(unread.map((b) => b.bookingId), true)}
          >
            Mark all {unread.length} as read
          </button>
        )}
      </div>

      {/* Filters */}
      <div className="grid gap-3 border border-line bg-white p-4 md:grid-cols-12">
        <div className="md:col-span-4">
          <label htmlFor="f-search" className="field-label">Search</label>
          <input
            id="f-search"
            type="search"
            className="field-input text-sm"
            placeholder="Name, phone or reference"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="md:col-span-2">
          <label htmlFor="f-status" className="field-label">Status</label>
          <select id="f-status" className="field-input text-sm" value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="all">All statuses</option>
            <option value="unread">Unread only</option>
            {BOOKING_STATUSES.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </div>
        <div className="md:col-span-2">
          <label htmlFor="f-datefield" className="field-label">Date</label>
          <select
            id="f-datefield"
            className="field-input text-sm"
            value={dateField}
            onChange={(e) => setDateField(e.target.value as DateField)}
          >
            <option value="createdAt">Submitted</option>
            <option value="preferredDate">Appointment</option>
          </select>
        </div>
        <div className="md:col-span-2">
          <label htmlFor="f-from" className="field-label">From</label>
          <input id="f-from" type="date" className="field-input text-sm" value={from} onChange={(e) => setFrom(e.target.value)} />
        </div>
        <div className="md:col-span-2">
          <label htmlFor="f-to" className="field-label">To</label>
          <input id="f-to" type="date" className="field-input text-sm" value={to} min={from || undefined} onChange={(e) => setTo(e.target.value)} />
        </div>
      </div>

      <div className="flex items-center justify-between text-sm text-stone">
        <p>
          {loading ? "Loading…" : `${filtered.length} of ${bookings.length} booking${bookings.length === 1 ? "" : "s"}`}
        </p>
        {hasFilters && (
          <button
            type="button"
            className="text-garnet hover:underline"
            onClick={() => {
              setSearch("");
              setStatus("all");
              setFrom("");
              setTo("");
            }}
          >
            Clear filters
          </button>
        )}
      </div>

      {error && <div className="border border-danger/30 bg-danger-soft p-4 text-sm text-danger">{error}</div>}

      {/* Desktop table */}
      <div className="hidden overflow-hidden border border-line bg-white md:block">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-line bg-pearl/60 text-xs tracking-[0.12em] text-stone uppercase">
            <tr>
              <th className="w-8 px-3 py-3"><span className="sr-only">Unread</span></th>
              <th className="px-3 py-3 font-normal">Customer</th>
              <th className="px-3 py-3 font-normal">Request</th>
              <th className="px-3 py-3 font-normal">Preferred</th>
              <th className="px-3 py-3 font-normal">Status</th>
              <th className="px-3 py-3 text-right font-normal">Received</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {filtered.map((b) => {
              const issue = gemstoneIssue(b);
              return (
                <tr
                  key={b.bookingId}
                  onClick={() => setOpen(b.bookingId)}
                  className={`cursor-pointer transition hover:bg-pearl ${!b.read ? "bg-garnet-soft/40" : ""} ${
                    b.status === "Pending" ? "shadow-[inset_3px_0_0_var(--color-warning)]" : ""
                  }`}
                >
                  <td className="px-3 py-3">{!b.read && <UnreadDot />}</td>
                  <td className="px-3 py-3">
                    <button
                      type="button"
                      className={`text-left hover:text-garnet ${!b.read ? "font-medium" : ""}`}
                      onClick={(e) => {
                        e.stopPropagation();
                        setOpen(b.bookingId);
                      }}
                    >
                      {b.customerName}
                    </button>
                    <span className="block font-mono text-xs text-mist">{b.referenceNumber}</span>
                    <span className="block text-xs text-stone">{b.phoneNumber}</span>
                  </td>
                  <td className="px-3 py-3">
                    <span className="flex items-center gap-1.5">
                      {b.gemstoneName ?? "General consultation"}
                      {issue && (
                        <span className="text-warning" title={issue}>
                          <WarningIcon />
                        </span>
                      )}
                    </span>
                    <span className="block text-xs text-stone">{BOOKING_TYPE_LABELS[b.bookingType]}</span>
                  </td>
                  <td className="px-3 py-3 text-stone">{formatPreferred(b.preferredDate, b.preferredTime)}</td>
                  <td className="px-3 py-3"><StatusBadge status={b.status} /></td>
                  <td className="px-3 py-3 text-right text-xs text-stone" title={formatDateTime(b.createdAt)}>
                    {timeAgo(b.createdAt)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {!loading && filtered.length === 0 && (
          <p className="p-10 text-center text-sm text-stone">
            {bookings.length ? "No bookings match these filters." : "No bookings yet."}
          </p>
        )}
      </div>

      {/* Mobile cards */}
      <ul className="space-y-2 md:hidden">
        {filtered.map((b) => (
          <li key={b.bookingId}>
            <button
              type="button"
              onClick={() => setOpen(b.bookingId)}
              className={`block w-full border bg-white p-4 text-left ${
                b.status === "Pending" ? "border-l-4 border-warning/60 border-y-line border-r-line" : "border-line"
              } ${!b.read ? "bg-garnet-soft/40" : ""}`}
            >
              <span className="flex items-center justify-between gap-2">
                <span className={`flex items-center gap-2 ${!b.read ? "font-medium" : ""}`}>
                  {!b.read && <UnreadDot />}
                  {b.customerName}
                </span>
                <StatusBadge status={b.status} />
              </span>
              <span className="mt-1 flex items-center gap-1.5 text-sm text-stone">
                {b.gemstoneName ?? BOOKING_TYPE_LABELS[b.bookingType]}
                {gemstoneIssue(b) && <span className="text-warning"><WarningIcon /></span>}
              </span>
              <span className="mt-1 flex justify-between text-xs text-mist">
                <span className="font-mono">{b.referenceNumber}</span>
                <span>{timeAgo(b.createdAt)}</span>
              </span>
            </button>
          </li>
        ))}
        {!loading && filtered.length === 0 && (
          <li className="p-8 text-center text-sm text-stone">No bookings match.</li>
        )}
      </ul>

      <BookingDrawer booking={selected} missing={Boolean(openId) && !loading && !selected} onClose={close} />
    </div>
  );
}

export default function BookingsPage() {
  return (
    <Suspense fallback={<p className="text-sm text-stone">Loading…</p>}>
      <BookingsView />
    </Suspense>
  );
}
