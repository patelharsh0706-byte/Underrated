import type { Metadata } from "next";
import { Archivo, Caveat, Geist, Geist_Mono } from "next/font/google";
import Script from "next/script";

import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";

import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

// V2 type system — see DESIGN.md § Type. Archivo carries headlines, numbers,
// buttons and labels; Caveat is marginalia only, never UI text. Geist stays
// the body face — untouched above.
const archivo = Archivo({
  variable: "--font-archivo",
  subsets: ["latin"],
});

const caveat = Caveat({
  variable: "--font-caveat",
  subsets: ["latin"],
  weight: ["600", "700"],
});

export const metadata: Metadata = {
  title: "Underhyped",
  description: "Discover people before everyone else does.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} ${archivo.variable} ${caveat.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-background text-foreground">
        <SiteHeader />
        {children}
        <SiteFooter />
        {/* DataFast — see DECISIONS.md 2026-09-07. The website id and domain
            are public by design (both readable in page source), so they are
            hardcoded rather than routed through lib/env.ts: there is nothing
            to keep secret and nothing to validate. In the root layout so it
            loads on every route. */}
        <Script
          src="https://datafa.st/js/script.js"
          data-website-id="dfid_CsTsKWHAwb1A8aN1k9iyf"
          data-domain="underhyped.wtf"
          strategy="afterInteractive"
        />
      </body>
    </html>
  );
}
