/** Philippine peso — default currency for FOSE. */
export const DEFAULT_CURRENCY = "PHP";

/** Manila-centric defaults for the live tracking map (domestic PH only). */
export const PH_MAP = {
  /** Approximate geographic center of the Philippine archipelago. */
  center: [12.8797, 121.774] as [number, number],
  /** Metro Manila fallback when a shipment has no coordinates. */
  manila: [14.5995, 120.9842] as [number, number],
  /**
   * Bounding box that keeps pan/zoom inside the Philippines
   * (south-west → north-east).
   */
  maxBounds: [
    [4.2, 116.0],
    [21.5, 127.0],
  ] as [[number, number], [number, number]],
  minZoom: 5,
  defaultZoom: 6,
  detailZoom: 10,
};

/** True when lat/lng fall inside the PH map bounds. */
export function isInPhilippines(lat: number, lng: number): boolean {
  const [[south, west], [north, east]] = PH_MAP.maxBounds;
  return lat >= south && lat <= north && lng >= west && lng <= east;
}
