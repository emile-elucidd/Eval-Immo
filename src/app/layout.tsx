import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";

// Fonts are served from src/fonts — the app makes no third-party requests.
const roboto = localFont({
  src: [{ path: "../fonts/Roboto-variable.woff2", weight: "100 900", style: "normal" }],
  variable: "--font-roboto",
  display: "swap",
  fallback: ["Arial", "sans-serif"],
});

/**
 * Only what is true of every client. Title, description and keywords name a
 * town and an agency, so they are set per landing in
 * `app/[agence]/[ville]/layout.tsx` and deliberately left generic here.
 */
export const metadata: Metadata = {
  title: "Estimation immobilière",
  description: "Estimation immobilière en ligne, à partir des ventes réelles enregistrées chez le notaire.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="fr" translate="no">
      <body
        className={`${roboto.variable} font-sans`}
      >
        {children}
      </body>
    </html>
  );
}
