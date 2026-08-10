import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { ToastProvider } from "@/components/ui/Toast";

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
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){
  try {
    var t = localStorage.getItem("theme");
    var dark = t ? t === "dark" : window.matchMedia("(prefers-color-scheme: dark)").matches;
    if (dark) document.documentElement.classList.add("dark");
  } catch (e) {}
})();`,
          }}
        />
      </head>
      <body className="font-sans text-slate-800 dark:text-slate-200 dark:bg-slate-950">
        <ToastProvider>{children}</ToastProvider>
      </body>
    </html>
  );
}
