import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import "./globals.css";

// Self-hosted pixel fonts (no network dependency at build time).
// Pixel display font for chrome/headings; a tall readable pixel font for body.
const pixel = localFont({
  src: "./fonts/PressStart2P-Regular.ttf",
  variable: "--font-pixel",
  display: "swap",
});
const body = localFont({
  src: "./fonts/VT323-Regular.ttf",
  variable: "--font-body",
  display: "swap",
});

export const metadata: Metadata = {
  title: "More Than a Club",
  description:
    "Run a sporting institution for 100 years while the world keeps changing the rules underneath you. A pixel-art sweep-of-history football game.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  themeColor: "#0b0f0c",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${pixel.variable} ${body.variable}`}>
      <body>{children}</body>
    </html>
  );
}
