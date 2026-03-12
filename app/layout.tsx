import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Sargam — AI Voice Agents for Every Indian Language",
  description:
    "Multilingual AI-powered calling agent for public services, customer support, surveys, grievance redressal, and outreach campaigns. Supports 11+ Indian languages with sub-second response times.",
  keywords: ["AI", "voice agent", "multilingual", "India", "calling", "STT", "TTS", "LLM"],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-slate-950 text-slate-200`}
      >
        {children}
      </body>
    </html>
  );
}
