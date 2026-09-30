import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * Horizontally scrollable table region — keeps wide operational tables inside
 * the card without forcing page-level overflow.
 */
export default function TableScroll({
  children,
  className,
  minWidth,
}: {
  children: ReactNode;
  className?: string;
  /** Minimum table width (e.g. "52rem") when columns cannot compress further. */
  minWidth?: string;
}) {
  return (
    <div className={cn("table-scroll max-w-full", className)}>
      <div className="w-full" style={minWidth ? { minWidth } : undefined}>
        {children}
      </div>
    </div>
  );
}
