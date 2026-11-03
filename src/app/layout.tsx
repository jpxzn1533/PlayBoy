import type { Metadata, Viewport } from "next";
import { Inter, Space_Grotesk } from "next/font/google";
import type { CSSProperties } from "react";
import { getSettings } from "@/lib/settings";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter", display: "swap" });
const display = Space_Grotesk({ subsets: ["latin"], variable: "--font-display", display: "swap" });

export async function generateMetadata(): Promise<Metadata> {
  const s = await getSettings();
  return {
    title: { default: `${s.storeName} — ${s.tagline}`, template: `%s · ${s.storeName}` },
    description: `${s.storeName}: produtos digitais e serviços para gamers, com entrega imediata e segurança.`,
    applicationName: s.storeName,
  };
}

export const viewport: Viewport = { themeColor: "#080808", colorScheme: "dark" };

/** Escolhe preto ou branco para o texto sobre a cor de destaque, conforme o contraste. */
function readableOn(hex: string) {
  const n = parseInt(hex.slice(1), 16);
  const [r, g, b] = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((v) => {
    const c = v / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b > 0.4 ? "#080808" : "#ffffff";
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const s = await getSettings();
  const style = {
    "--accent": s.accentColor,
    "--accent-fg": readableOn(s.accentColor),
    "--store-bg": s.backgroundColor,
  } as CSSProperties;
  return (
    <html lang="pt-BR" className={`${inter.variable} ${display.variable}`} style={style}>
      <body>{children}</body>
    </html>
  );
}
