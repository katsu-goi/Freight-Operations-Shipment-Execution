import { Ship, Plane, Truck, Train } from "lucide-react";
import type { TransportMode } from "@/types";

const MAP = {
  Ocean: { Icon: Ship, className: "text-blue-600" },
  Air: { Icon: Plane, className: "text-pink-600" },
  Road: { Icon: Truck, className: "text-emerald-600" },
  Rail: { Icon: Train, className: "text-amber-600" },
} as const;

export default function ModeIcon({
  mode,
  className = "w-3.5 h-3.5",
}: {
  mode: TransportMode;
  className?: string;
}) {
  const entry = MAP[mode] ?? MAP.Ocean;
  const { Icon } = entry;
  return <Icon className={`${className} ${entry.className}`} />;
}
