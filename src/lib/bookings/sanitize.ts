// Text sanitizing shared by client preview and server validation.

const CONTROL_CHARS = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F\u200B-\u200F\u202A-\u202E\u2066-\u2069]/g;
const HTML_TAGS = /<\/?[a-z][^>]*>/gi;
const ANGLE_BRACKETS = /[<>]/g;

/** Single-line text: strip tags, control chars, collapse whitespace. */
export function sanitizeLine(value: unknown): string {
  if (typeof value !== "string") return "";
  return value
    .replace(HTML_TAGS, "")
    .replace(CONTROL_CHARS, "")
    .replace(ANGLE_BRACKETS, "")
    .replace(/\s+/g, " ")
    .trim();
}

/** Multi-line text: like sanitizeLine but keeps (limited) line breaks. */
export function sanitizeMultiline(value: unknown): string {
  if (typeof value !== "string") return "";
  return value
    .replace(/\r\n?/g, "\n")
    .replace(HTML_TAGS, "")
    .replace(CONTROL_CHARS, "")
    .replace(ANGLE_BRACKETS, "")
    .split("\n")
    .map((line) => line.replace(/[ \t]+/g, " ").trim())
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

/** Keep only characters that belong in a phone number. */
export function sanitizePhone(value: unknown): string {
  if (typeof value !== "string") return "";
  return value.replace(/[^\d+()\-.\s]/g, "").replace(/\s+/g, " ").trim();
}

export function phoneDigits(value: string): string {
  return value.replace(/\D/g, "");
}

export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export function countLinks(value: string): number {
  return (value.match(/https?:\/\/|www\./gi) ?? []).length;
}
