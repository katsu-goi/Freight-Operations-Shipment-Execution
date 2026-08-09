import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });

export const metadata: Metadata = {
  title: "Airship Express — Operations & Shipment Execution",
  description:
    "Multimodal freight operations subsystem: booking, consolidation, Bills of Lading, live tracking, and PO integration.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={inter.variable}>
      <body className="font-sans text-slate-800">{children}</body>
    </html>
  );
}
