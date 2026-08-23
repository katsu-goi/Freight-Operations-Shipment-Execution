import { Check, CircleDot, Circle, AlertTriangle, MapPin } from "lucide-react";
import type { TrackingLog } from "@/types";
import {
  PARCEL_WORKFLOW,
  PARCEL_EXCEPTION_STATUSES,
  workflowIndex,
} from "@/lib/parcelWorkflow";
import StatusBadge from "@/components/ui/StatusBadge";
import { formatDate, formatDateTime } from "@/lib/utils";

/**
 * Visual parcel tracking timeline.
 * Completed steps show a check + timestamp; the current step is highlighted;
 * remaining steps render as pending. Failed/returned states surface inline.
 */
export default function TrackingTimeline({
  currentStatus,
  events = [],
}: {
  currentStatus: string;
  /** Chronological tracking events for this parcel. */
  events?: TrackingLog[];
}) {
  const exception =
    PARCEL_EXCEPTION_STATUSES.includes(currentStatus as (typeof PARCEL_EXCEPTION_STATUSES)[number]) ||
    ["Customs Hold", "Delayed"].includes(currentStatus);
  const reachedIdx = workflowIndex(currentStatus);
  const delivered = currentStatus === "Delivered";

  // Latest timestamp per workflow status from real tracking events.
  const eventByStatus = new Map<string, TrackingLog>();
  for (const e of events) {
    if (e.status) eventByStatus.set(e.status, e); // chronological → last wins
  }

  const steps = PARCEL_WORKFLOW.map((status) => ({
    status,
    event: eventByStatus.get(status) ?? null,
  }));

  return (
    <div className="space-y-0">
      {steps.map((step, idx) => {
        const done = reachedIdx !== null && idx < reachedIdx;
        const isCurrent =
          !delivered && !exception && idx === reachedIdx;
        const pending =
          reachedIdx === null ? true : idx > reachedIdx && !isCurrent;

        let icon = <Circle className="w-4 h-4" />;
        if (done || delivered) icon = <Check className="w-4 h-4" />;
        else if (isCurrent) icon = <CircleDot className="w-4 h-4" />;

        return (
          <div key={step.status} className="flex gap-3">
            {/* Rail */}
            <div className="flex flex-col items-center">
              <span
                className={`mt-1 flex items-center justify-center w-6 h-6 rounded-full border-2 shrink-0 transition-colors ${
                  done
                    ? "bg-emerald-500 border-emerald-500 text-white"
                    : isCurrent
                      ? "bg-pink-600 border-pink-600 text-white shadow-md shadow-pink-500/40"
                      : "border-slate-300 dark:border-slate-600 text-slate-400 dark:text-slate-500 bg-transparent"
                }`}
              >
                {icon}
              </span>
              {idx < steps.length - 1 && (
                <span
                  className={`w-0.5 flex-1 min-h-8 ${
                    done ? "bg-emerald-400/70" : "bg-slate-200 dark:bg-slate-700"
                  }`}
                />
              )}
            </div>

            {/* Content */}
            <div className={`pb-5 -mt-0.5 ${pending ? "opacity-60" : ""}`}>
              <div className="flex items-center gap-2 flex-wrap">
                <span
                  className={`text-sm font-bold ${
                    done
                      ? "text-slate-800 dark:text-slate-200"
                      : isCurrent
                        ? "text-pink-600 dark:text-pink-400"
                        : "text-slate-500 dark:text-slate-400"
                  }`}
                >
                  {labelFor(step.status)}
                </span>
                {isCurrent && (
                  <StatusBadge status={currentStatus} />
                )}
              </div>
              {(done || isCurrent) && step.event && (
                <div className="mt-0.5 space-y-0.5">
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
                    {formatDateTime(step.event.created_at)}
                  </p>
                  {step.event.location && (
                    <p className="text-[11px] text-slate-400 dark:text-slate-500 flex items-center gap-1">
                      <MapPin className="w-3 h-3" />
                      {step.event.location}
                    </p>
                  )}
                  {step.event.message &&
                    step.event.event_type !== "booking" && (
                      <p className="text-[11px] text-slate-400 dark:text-slate-500">
                        {step.event.message}
                      </p>
                    )}
                </div>
              )}
              {pending && (
                <p className="mt-0.5 text-[11px] text-slate-400 dark:text-slate-600 font-medium">
                  Pending
                </p>
              )}
            </div>
          </div>
        );
      })}

      {exception && (
        <div
          className={`flex items-start gap-3 rounded-xl border px-4 py-3 mt-2 ${
            currentStatus === "Delivery Failed"
              ? "border-rose-200 dark:border-rose-900 bg-rose-50 dark:bg-rose-950/30"
              : currentStatus === "Returned"
                ? "border-orange-200 dark:border-orange-900 bg-orange-50 dark:bg-orange-950/30"
                : "border-amber-200 dark:border-amber-900 bg-amber-50 dark:bg-amber-950/30"
          }`}
        >
          <AlertTriangle
            className={`w-5 h-5 mt-0.5 ${
              currentStatus === "Delivery Failed"
                ? "text-rose-600"
                : currentStatus === "Returned"
                  ? "text-orange-600"
                  : "text-amber-600"
            }`}
          />
          <div>
            <p className="text-sm font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
              {currentStatus}
              <StatusBadge status={currentStatus} />
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              {exceptionNote(events)}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

function labelFor(status: string): string {
  switch (status) {
    case "Registered":
      return "Parcel Registered";
    case "Pickup Scheduled":
      return "Pickup Scheduled";
    case "Picked Up":
      return "Picked Up";
    case "Dropped Off":
      return "Dropped Off";
    case "At Origin Hub":
      return "Arrived at Origin Hub";
    case "In Transit":
      return "In Transit";
    case "At Destination Hub":
      return "Arrived at Destination Hub";
    case "Out for Delivery":
      return "Out for Delivery";
    case "Delivered":
      return "Delivered";
    default:
      return status;
  }
}

function exceptionNote(events: TrackingLog[]): string {
  const last = events[events.length - 1];
  if (!last) return "Contact support for more information.";
  const date = formatDate(last.created_at);
  return last.message ? `${last.message} (${date})` : `Recorded ${date}.`;
}
