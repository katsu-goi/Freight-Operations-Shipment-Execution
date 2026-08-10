/**
 * Deterministic 3D-first bin packing for load allocation.
 *
 * Strategy: first-fit-decreasing — sort cargo by volume/weight then pack each
 * item into the first bin (vehicle/container) that still has room. Bins are
 * treated as cuboids with a weight ceiling; items are not rotated.
 *
 * Pure functions, no I/O — easy to unit test and to evolve into a full
 * 3D guillotine / shelf packer later.
 */

export interface CargoItem {
  id: string;
  /** Longest edge (cm) — controls the cuboid packing. */
  lengthCm: number;
  widthCm: number;
  heightCm: number;
  weightKg: number;
  /** Scratch space per item in cbm when exact dims are unknown. */
  volumeCbm?: number;
}

export interface BinSpec {
  id: string;
  label: string;
  lengthCm: number;
  widthCm: number;
  heightCm: number;
  maxWeightKg: number;
}

export interface PackedItem {
  item: CargoItem;
  binId: string;
}

export interface BinLoad {
  bin: BinSpec;
  items: CargoItem[];
  usedCbm: number;
  usedWeightKg: number;
}

export interface PackingResult {
  packed: BinLoad[];
  unpacked: CargoItem[];
}

/** 1 cbm = 1e6 cm^3. */
export const cubicCmToCbm = (cc: number): number => cc / 1_000_000;

/** Cuboid volume of an item in cbm (explicit volume wins). */
export function itemVolumeCbm(item: CargoItem): number {
  if (item.volumeCbm !== undefined && item.volumeCbm > 0) return item.volumeCbm;
  return cubicCmToCbm(item.lengthCm * item.widthCm * item.heightCm);
}

function fits(bin: BinSpec, item: CargoItem, current: BinLoad): boolean {
  const binCbm = cubicCmToCbm(bin.lengthCm * bin.widthCm * bin.heightCm);
  return (
    current.usedCbm + itemVolumeCbm(item) <= binCbm &&
    current.usedWeightKg + item.weightKg <= bin.maxWeightKg
  );
}

/**
 * Pack items into bins using first-fit-decreasing. Items are sorted hottest
 * first (largest volume) to minimize the number of bins used. Items that do
 * not fit any bin are returned as `unpacked` so callers can escalate them.
 */
export function packIntoBins(items: CargoItem[], bins: BinSpec[]): PackingResult {
  const sorted = [...items].sort(
    (a, b) => itemVolumeCbm(b) - itemVolumeCbm(a) || b.weightKg - a.weightKg,
  );

  const loads: BinLoad[] = bins.map((bin) => ({
    bin,
    items: [],
    usedCbm: 0,
    usedWeightKg: 0,
  }));
  const unpacked: CargoItem[] = [];

  for (const item of sorted) {
    const target = loads.find((l) => fits(l.bin, item, l));
    if (!target) {
      unpacked.push(item);
      continue;
    }
    target.items.push(item);
    target.usedCbm += itemVolumeCbm(item);
    target.usedWeightKg += item.weightKg;
  }

  // Drop empty bins from the result so callers only iterate actual loads.
  return { packed: loads.filter((l) => l.items.length > 0), unpacked };
}

/** Quick capacity summary used by the load-plan UI. */
export function utilizationPercent(load: BinLoad): number {
  const binCbm = cubicCmToCbm(load.bin.lengthCm * load.bin.widthCm * load.bin.heightCm);
  return binCbm > 0 ? Math.min(100, (load.usedCbm / binCbm) * 100) : 0;
}