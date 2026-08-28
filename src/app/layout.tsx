import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { ToastProvider } from "@/components/ui/Toast";
import ServiceWorkerRegister from "@/components/pwa/ServiceWorkerRegister";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });

export const metadata: Metadata = {
  title: "Airship Express — Operations & Shipment Execution",
  description:
    "Parcel management platform: booking, live tracking, seller tools and customer notifications.",
  manifest: "/manifest.webmanifest",
  appleWebApp: { capable: true, statusBarStyle: "black-translucent", title: "Airship" },
  icons: {
    icon: [
      { url: "/icons/airship-icon.png", type: "image/png", sizes: "512x512" },
      { url: "/icons/airship-pink-mark.png", type: "image/png", sizes: "512x256" },
      { url: "/icons/icon.svg", type: "image/svg+xml" },
    ],
    apple: "/icons/airship-icon.png",
  },
};

export const viewport: Viewport = {
  themeColor: "#ec4899",
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
        <ServiceWorkerRegister />
      </body>
    </html>
  );
}
