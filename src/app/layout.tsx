import "./globals.css";
import type { Metadata } from "next";
import { arvo, bungee, emilys } from "@/lib/fonts";

export const metadata: Metadata = {
  title: "Chores",
  description: "Two-kid chore tracker",
  icons: [
    { rel: "icon", url: "/icon.svg" },
    { rel: "apple-touch-icon", url: "/icon-192.png" }
  ],
  manifest: "/manifest.json",
  themeColor: "#ff8c1a"
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="Chores" />
      </head>
      <body className={`${arvo.className} ${arvo.variable} ${bungee.variable} ${emilys.variable}`}>
        {children}
      </body>
    </html>
  );
}
