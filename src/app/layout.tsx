import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

export const metadata: Metadata = {
  title: "ArgueMate - AI Debate Partner",
  description:
    "Practice debates with AI, improve critical thinking, and receive instant feedback.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning className={inter.variable}>
      <body className="min-h-screen bg-bg text-text antialiased overflow-x-hidden font-sans">
        {children}
      </body>
    </html>
  );
}