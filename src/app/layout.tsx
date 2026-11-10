import type { Metadata } from "next";
import { Cormorant_Garamond, Jost } from "next/font/google";
import { siteUrl } from "@/lib/site";
import "./globals.css";

const cormorant = Cormorant_Garamond({
  variable: "--font-cormorant",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  style: ["normal", "italic"],
});

const jost = Jost({
  variable: "--font-jost",
  subsets: ["latin"],
  weight: ["300", "400", "500"],
});

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl()),
  title: {
    default: "Jasper Gemstone — Fine Natural Gemstones",
    template: "%s · Jasper Gemstone",
  },
  description:
    "Hand-selected natural gemstones. Reserve a stone or book a private consultation with Jasper Gemstone.",
  openGraph: {
    type: "website",
    siteName: "Jasper Gemstone",
    images: [{ url: "/brand/jasper-logo.jpg", width: 3240, height: 3172, alt: "Jasper Gemstone" }],
  },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${cormorant.variable} ${jost.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
