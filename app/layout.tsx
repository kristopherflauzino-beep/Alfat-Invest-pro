import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "ALFATEC INVEST PRO",
  description: "Plataforma premium para análise de ações, FIIs, ETFs, BDRs, cripto e carteira de investimentos.",
  icons: {
    icon: [
      { url: "/favicon.ico", type: "image/x-icon" },
      { url: "/icon.png", type: "image/png", sizes: "512x512" }
    ],
    shortcut: "/favicon.ico",
    apple: "/apple-icon.png"
  }
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <body>{children}</body>
    </html>
  );
}
