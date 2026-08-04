"use client";

import { MapContainer, TileLayer, Marker, Popup, Polyline } from "react-leaflet";
import L from "leaflet";
import type { Shipment } from "@/types";

// Fix default marker icons for bundlers (Leaflet references image assets).
const icon = L.icon({
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

export default function TrackingMap({ shipment }: { shipment: Shipment | null }) {
  const lat = shipment?.current_lat ?? 20;
  const lng = shipment?.current_lng ?? 0;
  const hasPosition = shipment?.current_lat != null && shipment?.current_lng != null;

  return (
    <MapContainer
      center={[lat, lng]}
      zoom={hasPosition ? 4 : 2}
      scrollWheelZoom
      className="h-full w-full rounded-2xl"
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      {hasPosition && shipment && (
        <>
          <Marker position={[lat, lng]} icon={icon}>
            <Popup>
              <strong>{shipment.reference}</strong>
              <br />
              {shipment.current_location ?? "In transit"}
              <br />
              {shipment.origin} → {shipment.destination}
            </Popup>
          </Marker>
          <Polyline
            positions={[
              [lat, lng],
              [lat, lng],
            ]}
            pathOptions={{ color: "#ec4899", weight: 3, dashArray: "6" }}
          />
        </>
      )}
    </MapContainer>
  );
}
