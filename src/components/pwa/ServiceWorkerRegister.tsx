"use client";

import { useEffect } from "react";

/**
 * Registers the service worker (production builds only — registering in dev
 * would cache HMR chunks and break hot reload). Also listens for Background
 * Sync pings from the SW and replays the IndexedDB outbox.
 */
export default function ServiceWorkerRegister() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production") return;
    if (!("serviceWorker" in navigator)) return;

    const onMessage = (event: MessageEvent) => {
      if ((event.data as { type?: string })?.type === "flush-outbox") {
        void import("@/lib/offline/outbox").then((m) => m.flushOutbox());
      }
    };
    navigator.serviceWorker.addEventListener("message", onMessage);

    navigator.serviceWorker.register("/sw.js").catch(() => {
      /* SW is a progressive enhancement — ignore failures */
    });

    return () => navigator.serviceWorker.removeEventListener("message", onMessage);
  }, []);

  return null;
}