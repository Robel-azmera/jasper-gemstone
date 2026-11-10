"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import {
  changeStatus,
  deleteBooking,
  editBookingDetails,
  saveAdminNotes,
  setRead,
  subscribeHistory,
  type EditableBookingFields,
} from "@/lib/bookings/client";
import {
  BOOKING_STATUSES,
  BOOKING_TYPE_LABELS,
  BOOKING_TYPES,
  CONSULTATION_BOOKING_TYPES,
  CONTACT_PREFERENCES,
  GEMSTONE_BOOKING_TYPES,
  LIMITS,
  TIME_SLOTS,
  formatTimeSlot,
  type BookingStatus,
} from "@/lib/bookings/constants";
import { formatDateTime, formatPreferred, timeAgo } from "@/lib/bookings/format";
import { phoneDigits } from "@/lib/bookings/sanitize";
import type { Booking, BookingHistoryEntry } from "@/lib/bookings/types";
import { adminBookingEditSchema, fieldErrors } from "@/lib/bookings/validation";
import { Spinner } from "@/components/booking/Spinner";
import { useAdminUser } from "./AdminAuthProvider";
import { useBookings } from "./BookingsProvider";
import { ConfirmDialog, StatusBadge, WarningIcon } from "./ui";

interface Props {
  booking: Booking | null;
  /** True when the id in the URL doesn't match any booking (e.g. deleted). */
  missing: boolean;
  onClose: () => void;
}

export function BookingDrawer({ booking, missing, onClose }: Props) {
  const open = Boolean(booking) || missing;
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !document.querySelector("dialog[open]")) onClose();
    };
    document.addEventListener("keydown", onKey);
    panelRef.current?.focus();
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-40 flex justify-end" role="dialog" aria-modal="true" aria-label="Booking details">
      <button
        type="button"
        className="animate-fade-in absolute inset-0 bg-ink/40"
        aria-label="Close details"
        onClick={onClose}
      />
      <div
        ref={panelRef}
        tabIndex={-1}
        className="animate-slide-in relative flex h-full w-full max-w-xl flex-col bg-ivory shadow-2xl outline-none"
      >
        {booking ? (
          <DrawerContent key={booking.bookingId} booking={booking} onClose={onClose} />
        ) : (
          <div className="flex flex-1 flex-col items-center justify-center gap-4 p-8 text-center text-stone">
            <p>This booking no longer exists. It may have been deleted.</p>
            <button type="button" className="btn btn-outline btn-sm" onClick={onClose}>
              Close
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function Section({ title, children, action }: { title: string; children: ReactNode; action?: ReactNode }) {
  return (
    <section className="border-t border-line px-5 py-5 sm:px-6">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-xs tracking-[0.16em] text-stone uppercase">{title}</h3>
        {action}
      </div>
      {children}
    </section>
  );
}

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="grid grid-cols-3 gap-3 py-1.5 text-sm">
      <dt className="text-stone">{label}</dt>
      <dd className="col-span-2 break-words text-ink">{children}</dd>
    </div>
  );
}

function DrawerContent({ booking, onClose }: { booking: Booking; onClose: () => void }) {
  const user = useAdminUser();
  const actor = user.email;
  const { gemstoneIssue } = useBookings();
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [confirm, setConfirm] = useState<null | "cancel" | "delete">(null);
  const [editing, setEditing] = useState(false);
  const [notes, setNotes] = useState(booking.adminNotes);
  const [notesSaved, setNotesSaved] = useState(false);
  const [history, setHistory] = useState<BookingHistoryEntry[] | null>(null);
  const autoRead = useRef(false);

  // Opening a booking marks it as read.
  useEffect(() => {
    if (!booking.read && !autoRead.current) {
      autoRead.current = true;
      setRead([booking.bookingId], true).catch(() => {});
    }
  }, [booking.bookingId, booking.read]);

  useEffect(
    () => subscribeHistory(booking.bookingId, setHistory, () => setHistory([])),
    [booking.bookingId],
  );

  // Keep notes in sync with remote changes unless the admin is mid-edit.
  const [notesBase, setNotesBase] = useState(booking.adminNotes);
  if (booking.adminNotes !== notesBase) {
    setNotesBase(booking.adminNotes);
    if (notes === notesBase) setNotes(booking.adminNotes);
  }
  const notesDirty = notes !== booking.adminNotes;

  async function run(label: string, fn: () => Promise<void>) {
    setBusy(label);
    setError(null);
    try {
      await fn();
    } catch (e) {
      console.error(e);
      setError(
        e instanceof Error && e.message.includes("permission")
          ? "Permission denied. Your account may not have admin access."
          : "Something went wrong. Please try again.",
      );
      throw e;
    } finally {
      setBusy(null);
    }
  }

  const setStatus = (s: BookingStatus) => {
    if (s === "Cancelled") return setConfirm("cancel");
    run(`status:${s}`, () => changeStatus(booking, s, actor)).catch(() => {});
  };

  const issue = gemstoneIssue(booking);
  const digits = phoneDigits(booking.phoneNumber);

  return (
    <>
      {/* Header */}
      <div className="flex items-start justify-between gap-4 border-b border-line bg-white px-5 py-4 sm:px-6">
        <div className="min-w-0">
          <p className="font-mono text-sm tracking-wider text-garnet">{booking.referenceNumber}</p>
          <h2 className="mt-1 truncate font-serif text-3xl text-ink">{booking.customerName}</h2>
          <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-stone">
            <StatusBadge status={booking.status} />
            <span>Received {formatDateTime(booking.createdAt)}</span>
          </div>
        </div>
        <button type="button" onClick={onClose} className="-mr-2 p-2 text-stone hover:text-garnet" aria-label="Close">
          <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden>
            <path d="M6 6l12 12M18 6L6 18" strokeLinecap="round" />
          </svg>
        </button>
      </div>

      <div className="flex-1 overflow-y-auto">
        {(issue || (booking.gemstoneStatusAtBooking && booking.gemstoneStatusAtBooking !== "available")) && (
          <div className="m-5 flex gap-3 border border-warning/40 bg-warning-soft p-4 text-sm text-warning sm:mx-6">
            <WarningIcon className="mt-0.5 h-5 w-5 shrink-0" />
            <div>
              {issue && <p className="font-medium">{issue}</p>}
              {booking.gemstoneStatusAtBooking && booking.gemstoneStatusAtBooking !== "available" && (
                <p>The stone was already marked &quot;{booking.gemstoneStatusAtBooking}&quot; when this request was submitted.</p>
              )}
            </div>
          </div>
        )}

        {error && (
          <div role="alert" className="mx-5 mt-5 border border-danger/30 bg-danger-soft p-3 text-sm text-danger sm:mx-6">
            {error}
          </div>
        )}

        {/* Status */}
        <Section title="Status">
          <div className="flex flex-wrap gap-2" role="group" aria-label="Change status">
            {BOOKING_STATUSES.map((s) => (
              <button
                key={s}
                type="button"
                disabled={Boolean(busy) || booking.status === s}
                onClick={() => setStatus(s)}
                aria-pressed={booking.status === s}
                className={`inline-flex items-center gap-1.5 border px-3 py-1.5 text-sm transition disabled:cursor-default ${
                  booking.status === s
                    ? "border-garnet bg-garnet text-white"
                    : "border-line bg-white text-ink hover:border-stone disabled:opacity-50"
                }`}
              >
                {busy === `status:${s}` && <Spinner className="h-3 w-3" />}
                {s}
              </button>
            ))}
          </div>
          {booking.status === "Pending" && (
            <p className="mt-3 text-xs text-stone">
              Requests are never confirmed automatically. Check the stone&apos;s availability, then contact the customer.
            </p>
          )}
        </Section>

        {/* Contact */}
        <Section title="Contact">
          <div className="flex flex-wrap gap-2">
            <a href={`tel:${booking.phoneNumber.replace(/\s/g, "")}`} className="btn btn-outline btn-sm">
              Call
            </a>
            <a href={`https://wa.me/${digits}`} target="_blank" rel="noreferrer" className="btn btn-outline btn-sm">
              WhatsApp
            </a>
            {booking.email && (
              <a
                href={`mailto:${booking.email}?subject=${encodeURIComponent(`Your Jasper Gemstone request ${booking.referenceNumber}`)}`}
                className="btn btn-outline btn-sm"
              >
                Email
              </a>
            )}
          </div>
          <p className="mt-3 text-sm text-stone">
            Prefers <strong className="font-medium text-ink">{booking.contactPreference}</strong>
          </p>
        </Section>

        {/* Details */}
        <Section
          title="Booking details"
          action={
            !editing && (
              <button type="button" className="text-xs text-garnet hover:underline" onClick={() => setEditing(true)}>
                Edit
              </button>
            )
          }
        >
          {editing ? (
            <EditForm
              booking={booking}
              onCancel={() => setEditing(false)}
              onSave={(changes) =>
                run("edit", () => editBookingDetails(booking, changes, actor)).then(() => setEditing(false))
              }
              saving={busy === "edit"}
            />
          ) : (
            <dl>
              <Row label="Type">{BOOKING_TYPE_LABELS[booking.bookingType]}</Row>
              <Row label="Gemstone">
                {booking.gemstoneId ? (
                  <a
                    href={`/gemstones/${booking.gemstoneId}`}
                    target="_blank"
                    rel="noreferrer"
                    className="text-garnet underline-offset-2 hover:underline"
                  >
                    {booking.gemstoneName ?? booking.gemstoneId}
                  </a>
                ) : (
                  "General consultation"
                )}
              </Row>
              <Row label="Phone">{booking.phoneNumber}</Row>
              <Row label="Email">{booking.email || "—"}</Row>
              <Row label="Preferred">{formatPreferred(booking.preferredDate, booking.preferredTime)}</Row>
              <Row label="Message">
                <span className="whitespace-pre-wrap">{booking.message || "—"}</span>
              </Row>
              <Row label="Updated">{formatDateTime(booking.updatedAt)}</Row>
              <Row label="Booking ID">
                <span className="font-mono text-xs text-stone">{booking.bookingId}</span>
              </Row>
            </dl>
          )}
        </Section>

        {/* Internal notes */}
        <Section title="Internal notes">
          <textarea
            className="field-input min-h-28 resize-y text-sm"
            placeholder="Only visible to administrators…"
            maxLength={LIMITS.adminNotes}
            value={notes}
            onChange={(e) => {
              setNotes(e.target.value);
              setNotesSaved(false);
            }}
            aria-label="Internal administrative notes"
          />
          <div className="mt-2 flex items-center justify-end gap-3">
            {notesSaved && !notesDirty && <span className="text-xs text-success">Saved</span>}
            {notesDirty && (
              <button type="button" className="btn btn-ghost btn-sm" onClick={() => setNotes(booking.adminNotes)}>
                Discard
              </button>
            )}
            <button
              type="button"
              className="btn btn-primary btn-sm"
              disabled={!notesDirty || Boolean(busy)}
              onClick={() =>
                run("notes", () => saveAdminNotes(booking, notes.trim(), actor))
                  .then(() => setNotesSaved(true))
                  .catch(() => {})
              }
            >
              {busy === "notes" && <Spinner className="h-3 w-3" />} Save notes
            </button>
          </div>
        </Section>

        {/* History */}
        <Section title="History">
          {!history ? (
            <p className="text-sm text-stone">Loading…</p>
          ) : history.length === 0 ? (
            <p className="text-sm text-stone">No history recorded.</p>
          ) : (
            <ol className="relative space-y-4 border-l border-line pl-5">
              {history.map((h) => (
                <li key={h.id} className="relative text-sm">
                  <span className="absolute top-1.5 -left-[1.4rem] h-2 w-2 rounded-full bg-garnet ring-4 ring-ivory" aria-hidden />
                  <p className="text-ink">{h.summary}</p>
                  <p className="text-xs text-mist" title={formatDateTime(h.at)}>
                    {timeAgo(h.at)} · {h.actorEmail ?? "Website"}
                  </p>
                </li>
              ))}
            </ol>
          )}
        </Section>
      </div>

      {/* Footer actions */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-line bg-white px-5 py-3 sm:px-6">
        <button
          type="button"
          className="btn btn-ghost btn-sm px-2"
          onClick={() => {
            autoRead.current = true;
            run("read", () => setRead([booking.bookingId], !booking.read)).catch(() => {});
          }}
          disabled={Boolean(busy)}
        >
          Mark as {booking.read ? "unread" : "read"}
        </button>
        <div className="flex gap-2">
          {booking.status !== "Cancelled" && (
            <button type="button" className="btn btn-outline btn-sm" onClick={() => setConfirm("cancel")} disabled={Boolean(busy)}>
              Cancel booking
            </button>
          )}
          <button
            type="button"
            className="btn btn-sm border border-danger/40 text-danger hover:bg-danger hover:text-white"
            onClick={() => setConfirm("delete")}
            disabled={Boolean(busy)}
          >
            Delete
          </button>
        </div>
      </div>

      <ConfirmDialog
        open={confirm === "cancel"}
        title="Cancel this booking?"
        body={
          <>
            <strong className="text-ink">{booking.referenceNumber}</strong> will be marked as Cancelled. You can
            change the status again later. Remember to let the customer know.
          </>
        }
        confirmLabel="Cancel booking"
        tone="danger"
        busy={busy === "status:Cancelled"}
        onCancel={() => setConfirm(null)}
        onConfirm={() =>
          run("status:Cancelled", () => changeStatus(booking, "Cancelled", actor))
            .then(() => setConfirm(null))
            .catch(() => setConfirm(null))
        }
      />
      <ConfirmDialog
        open={confirm === "delete"}
        title="Delete permanently?"
        body={
          <>
            This permanently deletes booking <strong className="text-ink">{booking.referenceNumber}</strong> for{" "}
            {booking.customerName}, including its history. This cannot be undone. Consider cancelling instead to keep
            a record.
          </>
        }
        confirmLabel="Delete booking"
        tone="danger"
        busy={busy === "delete"}
        onCancel={() => setConfirm(null)}
        onConfirm={() =>
          run("delete", () => deleteBooking(booking.bookingId))
            .then(() => {
              setConfirm(null);
              onClose();
            })
            .catch(() => setConfirm(null))
        }
      />
    </>
  );
}

function EditForm({
  booking,
  onSave,
  onCancel,
  saving,
}: {
  booking: Booking;
  onSave: (changes: EditableBookingFields) => Promise<void>;
  onCancel: () => void;
  saving: boolean;
}) {
  const [v, setV] = useState({
    customerName: booking.customerName,
    phoneNumber: booking.phoneNumber,
    email: booking.email,
    contactPreference: booking.contactPreference as string,
    bookingType: booking.bookingType as string,
    preferredDate: booking.preferredDate ?? "",
    preferredTime: booking.preferredTime ?? "",
    message: booking.message,
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const set = (k: keyof typeof v) => (e: { target: { value: string } }) => setV({ ...v, [k]: e.target.value });

  const typeOptions = booking.gemstoneId ? GEMSTONE_BOOKING_TYPES : CONSULTATION_BOOKING_TYPES;
  const timeOptions: string[] = [...TIME_SLOTS];
  if (v.preferredTime && !timeOptions.includes(v.preferredTime)) timeOptions.unshift(v.preferredTime);

  function submit() {
    const parsed = adminBookingEditSchema.safeParse(v);
    if (!parsed.success) {
      setErrors(fieldErrors(parsed.error));
      return;
    }
    setErrors({});
    const d = parsed.data;
    onSave({
      ...d,
      preferredDate: d.preferredDate || null,
      preferredTime: d.preferredTime || null,
    }).catch(() => {});
  }

  const err = (k: string) => (errors[k] ? <p className="field-error">{errors[k]}</p> : null);

  return (
    <div className="space-y-4">
      <div>
        <label className="field-label" htmlFor="ed-name">Full name</label>
        <input id="ed-name" className="field-input text-sm" value={v.customerName} onChange={set("customerName")} />
        {err("customerName")}
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="field-label" htmlFor="ed-phone">Phone</label>
          <input id="ed-phone" className="field-input text-sm" value={v.phoneNumber} onChange={set("phoneNumber")} />
          {err("phoneNumber")}
        </div>
        <div>
          <label className="field-label" htmlFor="ed-email">Email</label>
          <input id="ed-email" className="field-input text-sm" value={v.email} onChange={set("email")} />
          {err("email")}
        </div>
        <div>
          <label className="field-label" htmlFor="ed-pref">Contact via</label>
          <select id="ed-pref" className="field-input text-sm" value={v.contactPreference} onChange={set("contactPreference")}>
            {CONTACT_PREFERENCES.map((p) => <option key={p}>{p}</option>)}
          </select>
        </div>
        <div>
          <label className="field-label" htmlFor="ed-type">Type</label>
          <select id="ed-type" className="field-input text-sm" value={v.bookingType} onChange={set("bookingType")}>
            {(typeOptions.includes(v.bookingType as never) ? typeOptions : BOOKING_TYPES).map((t) => (
              <option key={t} value={t}>{BOOKING_TYPE_LABELS[t]}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="field-label" htmlFor="ed-date">Preferred date</label>
          <input id="ed-date" type="date" className="field-input text-sm" value={v.preferredDate} onChange={set("preferredDate")} />
          {err("preferredDate")}
        </div>
        <div>
          <label className="field-label" htmlFor="ed-time">Preferred time</label>
          <select id="ed-time" className="field-input text-sm" value={v.preferredTime} onChange={set("preferredTime")}>
            <option value="">Any time</option>
            {timeOptions.map((t) => <option key={t} value={t}>{formatTimeSlot(t)}</option>)}
          </select>
        </div>
      </div>
      <div>
        <label className="field-label" htmlFor="ed-msg">Message</label>
        <textarea id="ed-msg" rows={4} className="field-input text-sm" value={v.message} onChange={set("message")} />
        {err("message")}
      </div>
      <div className="flex justify-end gap-2">
        <button type="button" className="btn btn-ghost btn-sm" onClick={onCancel} disabled={saving}>Cancel</button>
        <button type="button" className="btn btn-primary btn-sm" onClick={submit} disabled={saving}>
          {saving && <Spinner className="h-3 w-3" />} Save changes
        </button>
      </div>
    </div>
  );
}
