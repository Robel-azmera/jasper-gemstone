import type { Gemstone } from "./types";

function money(amount: number, currency: string): string {
  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: currency || "USD",
      maximumFractionDigits: 0,
    }).format(amount);
  } catch {
    return `${currency} ${Math.round(amount).toLocaleString("en-US")}`;
  }
}

export function formatPrice(gem: Pick<Gemstone, "price" | "currency">): string {
  if (gem.price == null) return "Price on request";
  return money(gem.price, gem.currency);
}

/** Price per carat, or null when price or weight is unknown. */
export function formatPerCarat(gem: Pick<Gemstone, "price" | "currency" | "carat">): string | null {
  if (gem.price == null || !gem.carat) return null;
  return money(gem.price / gem.carat, gem.currency);
}
