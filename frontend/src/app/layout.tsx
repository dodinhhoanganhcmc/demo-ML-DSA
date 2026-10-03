import type { Metadata } from "next";
import { Archivo, JetBrains_Mono } from "next/font/google";
import "./globals.css";

// Nonce-based CSP (src/proxy.ts) requires dynamic rendering: static pages are
// built without a request, so no nonce can be attached to their scripts.
export const dynamic = "force-dynamic";

// Archivo carries the width axis (62–125): the destination band runs condensed
// at wdth ~72, body copy sits at 100. JetBrains Mono is reserved for data the
// alignment actually depends on: hex specimens, byte counts, millisecond tables.
const sign = Archivo({
  subsets: ["latin"],
  axes: ["wdth"],
  variable: "--font-sign",
  display: "swap",
});

const mono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
  display: "swap",
});

const BASE_URL = "http://localhost:3000";
const DESCRIPTION =
  "Live post-quantum signature demonstrator: ML-DSA-44/65/87 key generation, signing and verification with sizes and timings measured at runtime.";

export const metadata: Metadata = {
  metadataBase: new URL(BASE_URL),
  title: "ML-DSA Signature Demo · FIPS 204",
  description: DESCRIPTION,
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    siteName: "ML-DSA Signature Demo",
    url: "/",
    title: "ML-DSA Signature Demo · FIPS 204",
    description: DESCRIPTION,
    locale: "en_US",
    images: [
      { url: "/og.png", width: 1200, height: 630, alt: "ML-DSA Signature Demo" },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "ML-DSA Signature Demo · FIPS 204",
    description: DESCRIPTION,
    images: ["/og.png"],
  },
  robots: { index: true, follow: true },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${sign.variable} ${mono.variable}`}>
      <body>{children}</body>
    </html>
  );
}
