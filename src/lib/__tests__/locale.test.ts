import { describe, it, expect } from "vitest";
import { isInPhilippines } from "@/lib/locale";

describe("isInPhilippines", () => {
  it("accepts domestic coordinates (Manila)", () => {
    expect(isInPhilippines(14.5995, 120.9842)).toBe(true);
    expect(isInPhilippines(10.3157, 123.8854)).toBe(true); // Cebu
    expect(isInPhilippines(7.1907, 125.4553)).toBe(true); // Davao
  });

  it("rejects out-of-bounds coordinates", () => {
    expect(isInPhilippines(35.6762, 139.6503)).toBe(false); // Tokyo
    expect(isInPhilippines(37.7749, -122.4194)).toBe(false); // SF
    expect(isInPhilippines(1.3521, 103.8198)).toBe(false); // Singapore
    expect(isInPhilippines(100, 100)).toBe(false);
    expect(isInPhilippines(-10, 120)).toBe(false);
  });
});