"use client";

import { useCallback, useEffect, useState, useTransition } from "react";
import { Link2, Loader2, Copy, Check, ShieldAlert, Ban, RefreshCw } from "lucide-react";
import {
  createTrackingLink,
  listParcelLinks,
  revokeTrackingLink,
  regenerateTrackingLink,
  type TrackingLinkRow,
} from "../tracking-links-actions";
import { useToast } from "@/components/ui/Toast";
import { formatDateTime } from "@/lib/utils";

/**
 * Seller-only tracking-link manager on the parcel detail page.
 * Generates private /t/<token> links (raw token shown once), lists active
 * links (metadata only — hashes/tokens never leave the server), and supports
 * revoke + regenerate. Rendered only for the owning seller (gated
 * server-side); every action re-verifies ownership.
 */
export default function TrackingLinkCard({ parcelId }: { parcelId: string }) {
  const toast = useToast();
  const [pending, startTransition] = useTransition();
  const [links, setLinks] = useState<TrackingLinkRow[]>([]);
  const [freshUrl, setFreshUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(() => {
    startTransition(async () => {
      const res = await listParcelLinks(parcelId);
      if (res.ok && res.value) setLinks(res.value);
      else if (!res.ok) setError(res.error);
    });
  }, [parcelId]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  function fullUrl(path: string): string {
    return `${window.location.origin}${path}`;
  }

  async function copyUrl(url: string) {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      toast.error("Copy failed — select the link manually");
    }
  }

  function onGenerate() {
    setError(null);
    setFreshUrl(null);
    startTransition(async () => {
      const res = await createTrackingLink({ parcelId });
      if (res.ok && res.value) {
        setFreshUrl(fullUrl(res.value.path));
        toast.success("Tracking link generated");
        refresh();
      } else if (!res.ok) {
        setError(res.error);
      }
    });
  }

  function onRevoke(linkId: string) {
    setError(null);
    startTransition(async () => {
      const res = await revokeTrackingLink({ linkId });
      if (res.ok) {
        toast.success("Tracking link revoked");
        refresh();
      } else {
        setError(res.error);
      }
    });
  }

  function onRegenerate(linkId: string) {
    setError(null);
    setFreshUrl(null);
    startTransition(async () => {
      const res = await regenerateTrackingLink({ parcelId, linkId });
      if (res.ok && res.value) {
        setFreshUrl(fullUrl(res.value.path));
        toast.success("New link generated — the old one no longer works");
        refresh();
      } else if (!res.ok) {
        setError(res.error);
      }
    });
  }

  const active = links.filter((l) => !l.revokedAt);

  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm p-5 space-y-4">
      <h3 className="text-sm font-black text-slate-900 dark:text-slate-100 flex items-center gap-2">
        <Link2 className="w-4 h-4 text-pink-600" />
        Customer Tracking Link
      </h3>
      <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
        Generate a private link for this parcel and send it to your customer by
        email or Messenger. Anyone with the link can <strong>view tracking only</strong> —
        no login, no edits. Revoke it anytime to disable access immediately.
      </p>

      {freshUrl && (
        <div className="rounded-xl border border-emerald-200 dark:border-emerald-900 bg-emerald-50 dark:bg-emerald-950/30 p-3 space-y-2">
          <p className="text-[11px] font-bold text-emerald-700 dark:text-emerald-300">
            New link — copy it now (shown only once)
          </p>
          <p className="font-mono text-xs break-all text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-900 rounded-lg px-3 py-2 border border-emerald-200 dark:border-emerald-900">
            {freshUrl}
          </p>
          <button
            type="button"
            onClick={() => copyUrl(freshUrl)}
            className="inline-flex items-center gap-1.5 bg-pink-600 hover:bg-pink-500 text-white px-3 py-1.5 rounded-lg text-xs font-bold transition-all"
          >
            {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
            {copied ? "Copied" : "Copy Link"}
          </button>
        </div>
      )}

      <button
        type="button"
        onClick={onGenerate}
        disabled={pending}
        className="inline-flex items-center gap-2 bg-pink-600 hover:bg-pink-500 disabled:opacity-60 text-white px-4 py-2 rounded-xl text-xs font-bold shadow-lg shadow-pink-600/30 transition-all active:scale-95"
      >
        {pending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Link2 className="w-3.5 h-3.5" />}
        Generate Tracking Link
      </button>

      {active.length > 0 && (
        <ul className="divide-y divide-slate-100 dark:divide-slate-800 border-t border-slate-100 dark:border-slate-800 pt-2">
          {active.map((l) => (
            <li key={l.id} className="py-2.5 flex items-center justify-between gap-2">
              <div className="min-w-0">
                <p className="text-xs font-bold text-slate-700 dark:text-slate-200 truncate">
                  {l.label || "Tracking link"}
                </p>
                <p className="text-[11px] text-slate-400">
                  Created {formatDateTime(l.createdAt)}
                  {l.expiresAt ? ` · expires ${formatDateTime(l.expiresAt)}` : ""}
                </p>
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                <button
                  type="button"
                  onClick={() => onRegenerate(l.id)}
                  disabled={pending}
                  title="Revoke this link and generate a new one"
                  className="inline-flex items-center gap-1 border border-slate-200 dark:border-slate-700 px-2.5 py-1.5 rounded-lg text-[11px] font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all disabled:opacity-60"
                >
                  <RefreshCw className="w-3 h-3" /> Regenerate
                </button>
                <button
                  type="button"
                  onClick={() => onRevoke(l.id)}
                  disabled={pending}
                  title="Disable this link immediately"
                  className="inline-flex items-center gap-1 border border-rose-200 dark:border-rose-900 px-2.5 py-1.5 rounded-lg text-[11px] font-bold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-all disabled:opacity-60"
                >
                  <Ban className="w-3 h-3" /> Revoke
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      {error && (
        <p className="text-xs text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 rounded-lg px-3 py-2 flex items-start gap-2">
          <ShieldAlert className="w-4 h-4 shrink-0 mt-0.5" /> {error}
        </p>
      )}
    </div>
  );
}
