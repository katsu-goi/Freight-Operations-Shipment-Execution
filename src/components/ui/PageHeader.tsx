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
    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
      <div>
        {eyebrow && (
          <div className="text-[11px] font-bold uppercase tracking-widest text-pink-600 mb-1">
            {eyebrow}
          </div>
        )}
        <h2 className="text-xl font-black tracking-tight text-slate-900">
          {title}
        </h2>
        {description && (
          <p className="text-xs text-slate-500 mt-1">{description}</p>
        )}
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </div>
  );
}
