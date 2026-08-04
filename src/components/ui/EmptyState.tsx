import type { LucideIcon } from "lucide-react";
import { Package } from "lucide-react";

export default function EmptyState({
  icon: Icon = Package,
  title,
  description,
  action,
}: {
  icon?: LucideIcon;
  title: string;
  description?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center text-center py-16 px-6">
      <div className="p-3 bg-slate-100 rounded-2xl text-slate-400 mb-4">
        <Icon className="w-8 h-8" />
      </div>
      <h3 className="text-sm font-bold text-slate-700">{title}</h3>
      {description && (
        <p className="text-xs text-slate-500 mt-1 max-w-sm">{description}</p>
      )}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
