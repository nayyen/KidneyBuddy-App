import type { Metadata, Viewport } from "next";
import { Plus_Jakarta_Sans, DM_Sans } from "next/font/google";
import { SerwistProvider } from "@serwist/turbopack/react";
import "./globals.css";

const plusJakartaSans = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-plus-jakarta-sans",
  display: "swap",
  weight: ["400", "500", "600", "700", "800"],
});

const dmSans = DM_Sans({
  subsets: ["latin"],
  variable: "--font-dm-sans",
  display: "swap",
  weight: ["300", "400", "500"],
});

export const metadata: Metadata = {
  title: "KidneyBuddy",
  description:
    "Pendamping harian untuk pasien gagal ginjal kronis di Indonesia",
  // manifest is now served via app/manifest.ts (MetadataRoute.Manifest)
  // at /manifest.webmanifest — no manual reference needed.
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "KidneyBuddy",
  },
};

export const viewport: Viewport = {
  themeColor: "#2a9d8f",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  maximumScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="id" className={`${plusJakartaSans.variable} ${dmSans.variable}`}>
      <body className="font-sans antialiased">
        {/* SerwistProvider registers the service worker at /serwist/sw.js.
            The SW is built on-demand by the Route Handler at app/serwist/[path]/route.ts.
            disable=false ensures the SW is registered in all environments.
            SerwistProvider is a Client Component — it only runs in the browser. */}
        <SerwistProvider swUrl="/serwist/sw.js">{children}</SerwistProvider>
      </body>
    </html>
  );
}
