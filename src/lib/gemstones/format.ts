import type { Gemstone } from "./types";

export function formatPrice(gem: Pick<Gemstone, "price" | "currency">): string {
  if (gem.price == null) return "Price on request";
  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: gem.currency || "USD",
      maximumFractionDigits: 0,
    }).format(gem.price);
  } catch {
    return `${gem.currency} ${gem.price.toLocaleString("en-US")}`;
  }
}
