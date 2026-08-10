"use client";

import { cn } from "@/lib/utils";

/** Pulsing placeholder block used for loading skeletons. */
export default function Skeleton({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "animate-pulse rounded-lg bg-slate-200/70 dark:bg-slate-800/60",
        className,
      )}
    />
  );
}