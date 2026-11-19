import type { Metadata } from "next";
import { GeistSans } from "geist/font/sans";
import { GeistSerif } from "geist/font/serif";
import { Suspense } from "react";
import { Header, HeaderFrame } from "@/lib/imports/screens";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "Mini Marketplace", template: "%s | Mini Marketplace" },
  description: "Browse and post local listings on Mini Marketplace.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${GeistSans.variable} ${GeistSerif.variable} antialiased`}>
      <body>
        <a href="#main-content" className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-50 focus:rounded-lg focus:bg-card focus:p-3">
          Skip to content
        </a>
        <Suspense fallback={<HeaderFrame />}><Header /></Suspense>
        {children}
      </body>
    </html>
  );
}
