import { describe, it, expect } from "vitest";
import {
  PARCEL_WORKFLOW,
  SETTABLE_STATUSES,
  PARCEL_EXCEPTION_STATUSES,
  workflowIndex,
  parcelProgress,
  isParcelActive,
  isExceptionStatus,
} from "@/lib/parcelWorkflow";

describe("parcel workflow", () => {
  it("defines the canonical delivery timeline in order", () => {
    expect(PARCEL_WORKFLOW[0]).toBe("Registered");
    expect(PARCEL_WORKFLOW[PARCEL_WORKFLOW.length - 1]).toBe("Delivered");
    expect(PARCEL_WORKFLOW).toContain("In Transit");
    expect(PARCEL_WORKFLOW).toContain("Out for Delivery");
  });

  it("every settable status is a known status and exceptions are separate", () => {
    const all = new Set([...PARCEL_WORKFLOW, ...PARCEL_EXCEPTION_STATUSES]);
    for (const s of SETTABLE_STATUSES) {
      expect(all.has(s)).toBe(true);
    }
    // No overlap between forward flow and exception states.
    for (const s of PARCEL_EXCEPTION_STATUSES) {
      expect(PARCEL_WORKFLOW).not.toContain(s);
    }
  });

  it("maps legacy hub statuses onto the canonical timeline", () => {
    expect(workflowIndex("Intake")).toBe(workflowIndex("Dropped Off"));
    expect(workflowIndex("Batched")).toBe(workflowIndex("At Origin Hub"));
    expect(workflowIndex("Booked")).toBe(workflowIndex("Registered"));
    expect(workflowIndex("Delivered")).toBe(PARCEL_WORKFLOW.length - 1);
  });

  it("monotonically increases progress along the happy path", () => {
    let prev = -1;
    for (const s of PARCEL_WORKFLOW) {
      const p = parcelProgress(s);
      expect(p).toBeGreaterThan(prev);
      prev = p;
    }
    expect(parcelProgress("Delivered")).toBe(100);
  });

  it("classifies active vs exception statuses", () => {
    expect(isParcelActive("In Transit")).toBe(true);
    expect(isParcelActive("Delivered")).toBe(false);
    expect(isParcelActive("Cancelled")).toBe(false);
    expect(isExceptionStatus("Delivery Failed")).toBe(true);
    expect(isExceptionStatus("Returned")).toBe(true);
    expect(isExceptionStatus("Out for Delivery")).toBe(false);
  });
});
