import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "ALFATEC INVEST PRO",
  description: "Plataforma premium para análise de ações, FIIs, ETFs, BDRs, cripto e carteira de investimentos.",
  icons: {
    icon: "/favicon.ico",
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
