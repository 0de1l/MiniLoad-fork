import type { Metadata } from "next";
import localFont from "next/font/local";
import { Press_Start_2P } from "next/font/google";
import "./globals.css";
import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import { AnalyticsTracker } from "@/components/analytics-tracker";

const pressStart2P = Press_Start_2P({
  weight: "400",
  subsets: ["latin"],
  variable: "--font-press-start",
});

const geistSans = localFont({
  variable: "--font-geist-sans",
  src: [
    {
      path: "../../public/overpass-desktop-fonts/overpass/overpass-regular.otf",
      weight: "400",
      style: "normal",
    },
    {
      path: "../../public/overpass-desktop-fonts/overpass/overpass-semibold.otf",
      weight: "600",
      style: "normal",
    },
    {
      path: "../../public/overpass-desktop-fonts/overpass/overpass-bold.otf",
      weight: "700",
      style: "normal",
    },
  ],
});

const geistMono = localFont({
  variable: "--font-geist-mono",
  src: [
    {
      path: "../../public/overpass-desktop-fonts/overpass-mono/overpass-mono-regular.otf",
      weight: "400",
      style: "normal",
    },
    {
      path: "../../public/overpass-desktop-fonts/overpass-mono/overpass-mono-semibold.otf",
      weight: "600",
      style: "normal",
    },
    {
      path: "../../public/overpass-desktop-fonts/overpass-mono/overpass-mono-bold.otf",
      weight: "700",
      style: "normal",
    },
  ],
});

export const metadata: Metadata = {
  title: "MiniLoad",
  description: "The darkness is boundless",
  icons: {
    icon: [
      { url: "/icon3-white.svg", type: "image/svg+xml", sizes: "any" },
      { url: "/icon3.png", type: "image/png", sizes: "32x32" },
      { url: "/icon3.png", type: "image/png", sizes: "16x16" },
      { url: "/icon3.png", type: "image/png", sizes: "192x192" },
    ],
    apple: [
      { url: "/icon3.png", sizes: "180x180", type: "image/png" },
    ],
  },
};

import { Suspense } from "react";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN" className="dark">
      <body
        className={`${geistSans.variable} ${geistMono.variable} ${pressStart2P.variable} antialiased min-h-screen flex flex-col relative bg-background`}
      >

        <Suspense fallback={null}>
          <Header />
        </Suspense>
        <Suspense fallback={null}>
          <AnalyticsTracker />
        </Suspense>
        <main className="flex-1 relative z-10">{children}</main>
        <Footer />
      </body>
    </html>
  );
}
