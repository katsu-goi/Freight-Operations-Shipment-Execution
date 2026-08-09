import { Plus } from "lucide-react";
import { requireRole } from "@/lib/auth";
import { aiEnabled } from "@/lib/ai";
import PageHeader from "@/components/ui/PageHeader";
import BookingForm from "./BookingForm";

export const dynamic = "force-dynamic";

export default async function BookingPage() {
  await requireRole(["Admin", "Dispatcher", "Planner"]);

  return (
    <div className="max-w-5xl mx-auto">
      <PageHeader
        eyebrow="Shipment Booking & Routing"
        title="Multimodal Shipment Booking Engine"
        description="Configure freight details and generate AI-optimized carrier routes."
        actions={
          <span className="bg-pink-50 text-pink-600 text-xs font-bold px-3 py-1.5 rounded-full border border-pink-200 flex items-center gap-1.5">
            <Plus className="w-3.5 h-3.5" /> New Booking
          </span>
        }
      />
      <BookingForm aiEnabled={aiEnabled()} />
    </div>
  );
}
