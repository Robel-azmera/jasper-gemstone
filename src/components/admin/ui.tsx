"use client";

import { useEffect, useRef, type ReactNode } from "react";
import type { BookingStatus } from "@/lib/bookings/constants";
import { Spinner } from "@/components/booking/Spinner";

const STATUS_STYLES: Record<BookingStatus, string> = {
  Pending: "bg-warning-soft text-warning ring-warning/30",
  Confirmed: "bg-info-soft text-info ring-info/30",
  Contacted: "bg-garnet-soft text-garnet ring-garnet/25",
  Completed: "bg-success-soft text-success ring-success/30",
  Cancelled: "bg-stone/10 text-stone ring-stone/25",
};

export function StatusBadge({ status }: { status: BookingStatus }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset ${STATUS_STYLES[status]}`}
    >
      {status === "Pending" && <span className="h-1.5 w-1.5 rounded-full bg-warning" aria-hidden />}
      {status}
    </span>
  );
}

export function UnreadDot({ className = "" }: { className?: string }) {
  return (
    <span className={`inline-block h-2 w-2 shrink-0 rounded-full bg-garnet ${className}`} aria-label="Unread" />
  );
}

export function WarningIcon({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
      <path d="M12 9v4m0 4h.01M10.3 3.9L1.8 18a2 2 0 001.7 3h17a2 2 0 001.7-3L13.7 3.9a2 2 0 00-3.4 0z" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  body: ReactNode;
  confirmLabel: string;
  tone?: "danger" | "default";
  busy?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

/** Accessible confirmation dialog built on <dialog>. */
export function ConfirmDialog({
  open,
  title,
  body,
  confirmLabel,
  tone = "default",
  busy,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) d.showModal();
    if (!open && d.open) d.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      onCancel={(e) => {
        e.preventDefault();
        if (!busy) onCancel();
      }}
      className="m-auto w-[min(92vw,26rem)] bg-white p-0 shadow-2xl backdrop:bg-ink/50"
      aria-labelledby="confirm-title"
    >
      {open && (
        <div className="animate-rise-in p-6">
          <h2 id="confirm-title" className="font-serif text-2xl text-ink">
            {title}
          </h2>
          <div className="mt-3 text-sm leading-relaxed text-stone">{body}</div>
          <div className="mt-6 flex justify-end gap-2">
            <button type="button" className="btn btn-outline btn-sm" onClick={onCancel} disabled={busy}>
              Keep
            </button>
            <button
              type="button"
              className={`btn btn-sm ${tone === "danger" ? "bg-danger text-white hover:bg-danger/90" : "btn-primary"}`}
              onClick={onConfirm}
              disabled={busy}
              autoFocus
            >
              {busy && <Spinner className="h-3.5 w-3.5" />}
              {confirmLabel}
            </button>
          </div>
        </div>
      )}
    </dialog>
  );
}

export function StatCard({
  label,
  value,
  tone = "default",
  hint,
}: {
  label: string;
  value: number | string;
  tone?: "default" | "attention" | "success" | "muted" | "info";
  hint?: string;
}) {
  const tones = {
    default: "border-line bg-white",
    attention: "border-warning/40 bg-warning-soft",
    success: "border-line bg-white",
    info: "border-line bg-white",
    muted: "border-line bg-white",
  };
  const valueTone = {
    default: "text-ink",
    attention: "text-warning",
    success: "text-success",
    info: "text-info",
    muted: "text-stone",
  };
  return (
    <div className={`border p-4 sm:p-5 ${tones[tone]}`}>
      <p className="text-xs tracking-[0.14em] text-stone uppercase">{label}</p>
      <p className={`mt-2 font-serif text-4xl tabular-nums ${valueTone[tone]}`}>{value}</p>
      {hint && <p className="mt-1 text-xs text-stone">{hint}</p>}
    </div>
  );
}
