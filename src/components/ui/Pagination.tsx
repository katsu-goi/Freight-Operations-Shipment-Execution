import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";

/** Server-rendered pagination that preserves the current query string. */
export default function Pagination({
  page,
  pageSize,
  total,
  basePath,
  params,
}: {
  page: number;
  pageSize: number;
  total: number;
  basePath: string;
  /** Current query params (search/filters) to preserve. */
  params: Record<string, string | undefined>;
}) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  if (totalPages <= 1) return null;

  function hrefFor(p: number): string {
    const qs = new URLSearchParams();
    for (const [k, v] of Object.entries(params)) {
      if (v && k !== "page") qs.set(k, v);
    }
    qs.set("page", String(p));
    return `${basePath}?${qs.toString()}`;
  }

  const from = (page - 1) * pageSize + 1;
  const to = Math.min(total, page * pageSize);

  // Windowed page numbers.
  const pages: number[] = [];
  const start = Math.max(1, Math.min(page - 2, totalPages - 4));
  for (let p = start; p <= Math.min(totalPages, start + 4); p++) pages.push(p);

  return (
    <div className="flex items-center justify-between px-5 py-3 border-t border-slate-100 dark:border-slate-800 flex-wrap gap-3">
      <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
        Showing <span className="font-bold">{from}</span>–
        <span className="font-bold">{to}</span> of{" "}
        <span className="font-bold">{total.toLocaleString("en-US")}</span>
      </p>
      <div className="flex items-center gap-1">
        {page > 1 && (
          <Link
            href={hrefFor(page - 1)}
            aria-label="Previous page"
            className="p-2 rounded-lg text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all"
          >
            <ChevronLeft className="w-4 h-4" />
          </Link>
        )}
        {pages.map((p) => (
          <Link
            key={p}
            href={hrefFor(p)}
            aria-current={p === page ? "page" : undefined}
            className={`min-w-8 text-center px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
              p === page
                ? "bg-pink-600 text-white shadow-md shadow-pink-600/30"
                : "text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
            }`}
          >
            {p}
          </Link>
        ))}
        {page < totalPages && (
          <Link
            href={hrefFor(page + 1)}
            aria-label="Next page"
            className="p-2 rounded-lg text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all"
          >
            <ChevronRight className="w-4 h-4" />
          </Link>
        )}
      </div>
    </div>
  );
}
