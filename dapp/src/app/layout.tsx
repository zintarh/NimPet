import type { Metadata, Viewport } from "next";
import { DM_Sans, DM_Mono, Unbounded } from "next/font/google";
import "./globals.css";

const dmSans = DM_Sans({
  variable: "--font-dm-sans",
  subsets: ["latin"],
});

const dmMono = DM_Mono({
  variable: "--font-dm-mono",
  subsets: ["latin"],
  weight: ["300", "400", "500"],
});

const unbounded = Unbounded({
  variable: "--font-unbounded",
  subsets: ["latin"],
  weight: ["500", "700", "900"],
});

export const viewport: Viewport = {
  themeColor: "#2e7d32",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
};

export const metadata: Metadata = {
  metadataBase: new URL("https://focusling.app"),
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "NimPet",
  },
  title: "NimPet — Focus. Earn. Evolve.",
  description:
    "Focus. Earn. Evolve. Turn every deep work session into your pet's growth — a Nimiq Pay mini app on Base.",
  openGraph: {
    title: "NimPet — Focus. Earn. Evolve.",
    description:
      "Focus. Earn. Evolve. Turn every deep work session into your pet's growth.",
    images: [
      {
        url: "/api/og",
        width: 1200,
        height: 630,
        alt: "NimPet - Gamified Deep Work",
      },
    ],
    type: "website",
    url: "https://focusling.app",
    siteName: "NimPet",
  },
  twitter: {
    card: "summary_large_image",
    title: "NimPet — Focus. Earn. Evolve.",
    description:
      "Focus. Earn. Evolve. Turn every deep work session into your pet's growth.",
    images: ["https://focusling.app/api/og"],
    creator: "@NimPet",
  },
};

import { Providers } from "./providers";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body
        className={`${dmSans.variable} ${dmMono.variable} ${unbounded.variable} antialiased overflow-x-hidden`}
      >
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
