import { statusBadgeClass } from "@/lib/utils";

export default function StatusBadge({ status }: { status: string }) {
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ${statusBadgeClass(
        status,
      )}`}
    >
      {status}
    </span>
  );
}
