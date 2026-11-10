import { formatTimeSlot } from "./constants";

const dateTimeFmt = new Intl.DateTimeFormat("en-GB", {
  day: "numeric",
  month: "short",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});
const dateFmt = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", year: "numeric" });

export function formatDateTime(d: Date | null): string {
  return d ? dateTimeFmt.format(d) : "—";
}

/** Format a stored "YYYY-MM-DD" (timezone-independent). */
export function formatDay(day: string | null): string {
  if (!day) return "—";
  const [y, m, dd] = day.split("-").map(Number);
  return dateFmt.format(new Date(y, m - 1, dd));
}

export function formatPreferred(date: string | null, time: string | null): string {
  if (!date && !time) return "No preference";
  return [date ? formatDay(date) : "Any day", time ? formatTimeSlot(time) : "any time"].join(", ");
}

export function timeAgo(d: Date | null, now = Date.now()): string {
  if (!d) return "";
  const s = Math.round((now - d.getTime()) / 1000);
  if (s < 45) return "just now";
  const m = Math.round(s / 60);
  if (m < 60) return `${m} min ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h} h ago`;
  const days = Math.round(h / 24);
  if (days < 7) return `${days} d ago`;
  return dateFmt.format(d);
}

/** Local "YYYY-MM-DD" for a Date (for date filtering). */
export function localDay(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${dd}`;
}
