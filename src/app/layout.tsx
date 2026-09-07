import type { Metadata } from "next";
import { Geist_Mono, Instrument_Serif } from "next/font/google";
import { AppShell } from "@/components/AppShell";
import "./globals.css";

const serif = Instrument_Serif({
  variable: "--font-serif",
  subsets: ["latin"],
  weight: "400",
});

const mono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Traverse",
  description:
    "Survey how a buyer AI agent navigates public websites. Real public crawls. No login. No form submit.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={`${serif.variable} ${mono.variable} antialiased`}>
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
