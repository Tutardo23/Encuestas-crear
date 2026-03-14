// src/app/layout.tsx
import type { Metadata } from "next";
import { Inter, Bebas_Neue } from "next/font/google";
import "./globals.css";
import { Providers } from "./providers";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  weight: ["300", "400", "500", "600", "700"],
  display: "swap",
});

const bebas = Bebas_Neue({
  subsets: ["latin"],
  variable: "--font-bebas",
  weight: "400",
  display: "swap",
});

export const metadata: Metadata = {
  title: { default: "Torx Survey", template: "%s · Torx Survey" },
  description: "Plataforma de encuestas personalizadas",
  robots: { index: false, follow: false }, // Privado — no indexar
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" className={`${inter.variable} ${bebas.variable}`}>
      <body className="min-h-screen bg-torx-dark font-sans antialiased">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
