export default function PageHeader({
  eyebrow,
  title,
  description,
  actions,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  actions?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-3 md:gap-4 mb-4 sm:mb-6 min-w-0">
      <div className="min-w-0 flex-1">
        {eyebrow && (
          <div className="text-[11px] font-bold uppercase tracking-widest text-pink-600 mb-1">
            {eyebrow}
          </div>
        )}
        <h2 className="fluid-title font-black tracking-tight text-slate-900 dark:text-slate-100 break-words">
          {title}
        </h2>
        {description && (
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-prose">{description}</p>
        )}
      </div>
      {actions && (
        <div className="flex flex-wrap items-center gap-2 shrink-0 w-full md:w-auto md:justify-end">
          {actions}
        </div>
      )}
    </div>
  );
}
