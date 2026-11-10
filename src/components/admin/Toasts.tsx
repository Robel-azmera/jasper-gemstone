"use client";

import Link from "next/link";
import { useEffect } from "react";
import { BOOKING_TYPE_LABELS } from "@/lib/bookings/constants";
import { useBookings, type Toast } from "./BookingsProvider";

function ToastItem({ toast, dismiss }: { toast: Toast; dismiss: (id: string) => void }) {
  const onDismiss = () => dismiss(toast.id);
  useEffect(() => {
    const t = setTimeout(() => dismiss(toast.id), 10000);
    return () => clearTimeout(t);
  }, [dismiss, toast.id]);
  const b = toast.booking;
  return (
    <div className="animate-slide-in pointer-events-auto flex w-[min(92vw,22rem)] gap-3 border-l-4 border-garnet bg-white p-4 shadow-xl">
      <div className="min-w-0 flex-1">
        <p className="text-xs tracking-[0.14em] text-garnet uppercase">New booking</p>
        <p className="mt-1 truncate text-sm font-medium text-ink">{b.customerName}</p>
        <p className="truncate text-xs text-stone">{b.gemstoneName ?? BOOKING_TYPE_LABELS[b.bookingType]}</p>
        <Link
          href={`/admin/bookings?open=${b.bookingId}`}
          onClick={onDismiss}
          className="mt-2 inline-block text-xs text-garnet underline-offset-2 hover:underline"
        >
          Open booking
        </Link>
      </div>
      <button type="button" onClick={onDismiss} className="self-start text-mist hover:text-ink" aria-label="Dismiss">
        ×
      </button>
    </div>
  );
}

export function Toasts() {
  const { toasts, dismissToast } = useBookings();
  return (
    <div
      className="pointer-events-none fixed right-4 bottom-4 z-50 flex flex-col gap-2"
      aria-live="polite"
      role="status"
    >
      {toasts.map((t) => (
        <ToastItem key={t.id} toast={t} dismiss={dismissToast} />
      ))}
    </div>
  );
}
