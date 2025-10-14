import "./globals.css";
import type { Metadata, Viewport } from "next";
import { arvo, bungee, emilys } from "@/lib/fonts";

export const metadata: Metadata = {
  title: "Chores",
  description: "Two-kid chore tracker",
  manifest: "/manifest.json",
  icons: {
    icon: [
      { url: "/favicon-32x32.png", sizes: "32x32", type: "image/png" },
      { url: "/favicon-16x16.png", sizes: "16x16", type: "image/png" },
      { url: "/favicon.ico" },
      { url: "/icon.svg", type: "image/svg+xml" }
    ],
    apple: [{ url: "/apple-touch-icon.png", sizes: "180x180" }]
  }
};

export const viewport: Viewport = {
  themeColor: "#ff8c1a"
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="Chores" />
        {/* Explicit Apple touch icons for iOS Home Screen */}
        <link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon-180x180.png" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
      </head>
      <body className={`${arvo.className} ${arvo.variable} ${bungee.variable} ${emilys.variable}`}>
        {children}
      </body>
    </html>
  );
}
