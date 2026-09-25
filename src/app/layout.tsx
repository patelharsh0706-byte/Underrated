import type { Metadata } from "next";
import { Archivo, Caveat, Geist, Geist_Mono } from "next/font/google";
import { Analytics } from "@vercel/analytics/next";

import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { THEME_SCRIPT } from "@/components/shell/theme-script";

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
  // www is the canonical host — the apex 308s to it, and crawlers (Twitter
  // especially) will not follow a redirect on og:image.
  metadataBase: new URL("https://www.underhyped.wtf"),
  title: "Underhyped",
  description: "Discover people before everyone else does.",
  openGraph: {
    title: "Underhyped",
    description: "Discover people before everyone else does.",
    images: ["/og-image.png"],
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Underhyped",
    description: "Discover people before everyone else does.",
    images: ["/og-image.png"],
  },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    // suppressHydrationWarning: the inline script below may stamp
    // data-theme before React hydrates — the DOM wins (DESIGN.md § Night theme).
    <html
      lang="en"
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable} ${archivo.variable} ${caveat.variable} h-full antialiased`}
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }} />
      </head>
      <body className="min-h-full flex flex-col bg-background text-foreground">
        <SiteHeader />
        {children}
        <SiteFooter />
        {/* Vercel Web Analytics — see DECISIONS.md 2026-09-24. No key: it
            posts to /_vercel/insights on the deployment that served the page,
            and collects nothing until Web Analytics is enabled on the project
            in the Vercel dashboard. In the root layout so it covers every
            route. */}
        <Analytics />
      </body>
    </html>
  );
}
