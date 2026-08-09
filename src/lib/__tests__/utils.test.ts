import { describe, it, expect } from "vitest";
import { cn, formatCurrency, formatDate, statusBadgeClass } from "@/lib/utils";

describe("cn", () => {
  it("joins truthy values and drops falsy ones", () => {
    expect(cn("a", false, "b", null, undefined, "", "c")).toBe("a b c");
  });
});

describe("formatCurrency", () => {
  it("formats PHP and coerces legacy USD to PHP", () => {
    expect(formatCurrency(1235)).toBe("₱1,235");
    expect(formatCurrency(1235, "PHP")).toBe("₱1,235");
    expect(formatCurrency(1235, "USD").startsWith("₱")).toBe(true);
  });
});

describe("formatDate", () => {
  it("handles null and invalid values gracefully", () => {
    expect(formatDate(null)).toBe("—");
    expect(formatDate(undefined)).toBe("—");
    expect(formatDate("not-a-date")).toBe("—");
    expect(formatDate("2026-08-02")).not.toBe("—");
  });
});

describe("statusBadgeClass", () => {
  it("maps each status to a distinguishable class", () => {
    const classes = new Set(
      ["Booked", "In Transit", "Customs Hold", "Delivered", "Delayed", "Cancelled"].map(
        statusBadgeClass,
      ),
    );
    expect(classes.size).toBeGreaterThan(3);
  });
});