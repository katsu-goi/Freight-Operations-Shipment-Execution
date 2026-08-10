import Skeleton from "@/components/ui/Skeleton";

export default function AppLoading() {
  return (
    <div className="space-y-6">
      {/* Banner */}
      <Skeleton className="h-32 rounded-2xl" />

      {/* KPI cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-28 rounded-2xl" />
        ))}
      </div>

      {/* Chart + feed */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Skeleton className="lg:col-span-2 h-80 rounded-2xl" />
        <Skeleton className="h-80 rounded-2xl" />
      </div>

      {/* Table */}
      <Skeleton className="h-72 rounded-2xl" />
    </div>
  );
}