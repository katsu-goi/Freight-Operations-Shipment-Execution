"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

/**
 * Automatic session timeout on inactivity.
 *
 * - Default 15 minutes (matches `[auth.sessions] inactivity_timeout` in
 *   supabase/config.toml). Override with NEXT_PUBLIC_SESSION_TIMEOUT_MINUTES.
 * - Any mouse / keyboard / touch / scroll activity resets the clock.
 * - A warning banner appears 60s before expiry with "Stay signed in".
 * - On expiry the Supabase session is signed out and the user is sent to
 *   /login?timeout=1.
 */
const WARNING_BEFORE_MS = 60_000;

function timeoutMs(): number {
  const minutes = Number(
    process.env.NEXT_PUBLIC_SESSION_TIMEOUT_MINUTES ?? "15",
  );
  return (Number.isFinite(minutes) && minutes > 0 ? minutes : 15) * 60_000;
}

export default function SessionTimeoutGuard() {
  const router = useRouter();
  const [secondsLeft, setSecondsLeft] = useState<number | null>(null);
  const lastActive = useRef<number>(Date.now());
  const expired = useRef(false);

  const touch = useCallback(() => {
    lastActive.current = Date.now();
    setSecondsLeft(null);
  }, []);

  useEffect(() => {
    const events = ["mousemove", "mousedown", "keydown", "touchstart", "scroll"];
    events.forEach((e) => window.addEventListener(e, touch, { passive: true }));

    const tick = async () => {
      if (expired.current) return;
      const idleFor = Date.now() - lastActive.current;
      const remaining = timeoutMs() - idleFor;
      if (remaining <= 0) {
        expired.current = true;
        try {
          const supabase = createClient();
          await supabase.auth.signOut();
        } finally {
          router.push("/login?timeout=1");
        }
        return;
      }
      setSecondsLeft(
        remaining <= WARNING_BEFORE_MS ? Math.ceil(remaining / 1000) : null,
      );
    };
    const id = window.setInterval(tick, 1000);
    return () => {
      window.clearInterval(id);
      events.forEach((e) => window.removeEventListener(e, touch));
    };
  }, [router, touch]);

  if (secondsLeft === null) return null;

  return (
    <div
      role="alert"
      className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 rounded-xl border border-amber-300/40 bg-amber-950/95 px-4 py-3 text-sm text-amber-100 shadow-2xl backdrop-blur"
    >
      <span>
        Session expires in <strong className="tabular-nums">{secondsLeft}s</strong>{" "}
        due to inactivity.
      </span>
      <button
        type="button"
        onClick={touch}
        className="rounded-lg bg-amber-400 px-3 py-1.5 text-xs font-bold text-amber-950 hover:bg-amber-300 transition cursor-pointer"
      >
        Stay signed in
      </button>
    </div>
  );
}
