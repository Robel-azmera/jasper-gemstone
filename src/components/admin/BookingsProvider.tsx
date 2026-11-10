"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import {
  subscribeBookings,
  subscribeGemstoneAvailability,
  type GemstoneAvailability,
} from "@/lib/bookings/client";
import type { BookingStatus } from "@/lib/bookings/constants";
import type { Booking } from "@/lib/bookings/types";

export interface Toast {
  id: string;
  booking: Booking;
}

interface BookingsContextValue {
  bookings: Booking[];
  loading: boolean;
  error: string | null;
  unread: Booking[];
  counts: Record<BookingStatus | "Total", number>;
  byId: Map<string, Booking>;
  toasts: Toast[];
  dismissToast: (id: string) => void;
  /** Human-readable availability problem for a booking's gemstone, if any. */
  gemstoneIssue: (b: Booking) => string | null;
}

const BookingsContext = createContext<BookingsContextValue | null>(null);

const ACTIVE: BookingStatus[] = ["Pending", "Confirmed", "Contacted"];

export function BookingsProvider({ children }: { children: ReactNode }) {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [gems, setGems] = useState<Map<string, GemstoneAvailability> | null>(null);
  const audioCtx = useRef<AudioContext | null>(null);

  const dismissToast = useCallback((id: string) => {
    setToasts((t) => t.filter((x) => x.id !== id));
  }, []);

  useEffect(() => {
    const unsubBookings = subscribeBookings(
      ({ bookings: list, arrived }) => {
        setBookings(list);
        setLoading(false);
        setError(null);
        if (arrived.length) {
          setToasts((t) => [...arrived.map((b) => ({ id: b.bookingId, booking: b })), ...t].slice(0, 4));
          chime(audioCtx);
        }
      },
      (e) => {
        setLoading(false);
        setError(
          e.message.includes("permission")
            ? "You don't have permission to read bookings. Make sure your account has the admin claim."
            : e.message,
        );
      },
    );
    const unsubGems = subscribeGemstoneAvailability(setGems, (e) =>
      console.warn("[admin] gemstone availability listener failed", e),
    );
    return () => {
      unsubBookings();
      unsubGems();
    };
  }, []);

  const value = useMemo<BookingsContextValue>(() => {
    const counts = { Total: bookings.length, Pending: 0, Confirmed: 0, Contacted: 0, Completed: 0, Cancelled: 0 };
    for (const b of bookings) counts[b.status]++;
    const byId = new Map(bookings.map((b) => [b.bookingId, b]));

    const gemstoneIssue = (b: Booking): string | null => {
      if (!b.gemstoneId || !gems) return null;
      const g = gems.get(b.gemstoneId);
      const active = ACTIVE.includes(b.status);
      if (!g) return active ? "This gemstone is no longer listed in the catalogue." : null;
      if (g.status !== "available" && active) {
        return `This gemstone is currently marked "${g.status}". Check availability before confirming.`;
      }
      return null;
    };

    return {
      bookings,
      loading,
      error,
      unread: bookings.filter((b) => !b.read),
      counts,
      byId,
      toasts,
      dismissToast,
      gemstoneIssue,
    };
  }, [bookings, loading, error, toasts, dismissToast, gems]);

  // Unread count in the browser tab title.
  useEffect(() => {
    const base = "Bookings · Jasper Admin";
    document.title = value.unread.length ? `(${value.unread.length}) ${base}` : base;
  }, [value.unread.length]);

  return <BookingsContext.Provider value={value}>{children}</BookingsContext.Provider>;
}

export function useBookings(): BookingsContextValue {
  const ctx = useContext(BookingsContext);
  if (!ctx) throw new Error("useBookings must be used inside BookingsProvider");
  return ctx;
}

/** Soft two-note chime for new bookings (silently ignored if audio is blocked). */
function chime(ref: { current: AudioContext | null }) {
  try {
    ref.current ??= new AudioContext();
    const ctx = ref.current;
    [880, 1320].forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.frequency.value = freq;
      osc.type = "sine";
      const t = ctx.currentTime + i * 0.12;
      gain.gain.setValueAtTime(0.0001, t);
      gain.gain.exponentialRampToValueAtTime(0.06, t + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.5);
      osc.connect(gain).connect(ctx.destination);
      osc.start(t);
      osc.stop(t + 0.55);
    });
  } catch {
    /* ignore */
  }
}
