import type { Metadata, Viewport } from "next";
import { Inter, Lexend_Exa } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });
const display = Lexend_Exa({ subsets: ["latin"], weight: ["500", "600"], variable: "--font-display" });

export const metadata: Metadata = {
  title: { default: "Fusion Mobile", template: "%s · Fusion Mobile" },
  description: "Phone-first console for a Sophos Fusion tenant.",
  applicationName: "Fusion Mobile",
  robots: { index: false, follow: false },
  appleWebApp: { capable: true, title: "Fusion", statusBarStyle: "black-translucent" },
};

export const viewport: Viewport = {
  themeColor: "#0A143A",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${inter.variable} ${display.variable}`}>
      <body>{children}</body>
    </html>
  );
}
