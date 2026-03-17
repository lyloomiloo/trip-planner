"use client";

import { useEffect } from "react";
import { MapContainer, TileLayer, Marker, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import type { CityData } from "@/types/itinerary";

// Custom red pin icon matching the original SVG design
const pinIcon = L.divIcon({
  html: `<svg width="24" height="32" viewBox="0 0 18 24" fill="none">
    <path d="M9 0C4.03 0 0 4.03 0 9c0 6.75 9 15 9 15s9-8.25 9-15c0-4.97-4.03-9-9-9z" fill="#C0392B"/>
    <circle cx="9" cy="9" r="3.5" fill="#7B241C"/>
  </svg>`,
  className: "",
  iconSize: [24, 32],
  iconAnchor: [12, 32],
});

/** Auto-fits the map bounds to show all cities with padding */
function FitBounds({ cities }: { cities: CityData[] }) {
  const map = useMap();
  useEffect(() => {
    if (cities.length === 0) return;
    const bounds = L.latLngBounds(cities.map((c) => [c.lat, c.lng]));
    map.fitBounds(bounds, { padding: [80, 80], animate: false });
  }, [cities, map]);
  return null;
}

interface CoverMapProps {
  cities: Record<string, CityData>;
}

export default function CoverMap({ cities }: CoverMapProps) {
  const cityList = Object.values(cities);
  const center: [number, number] =
    cityList.length > 0
      ? [
          cityList.reduce((s, c) => s + c.lat, 0) / cityList.length,
          cityList.reduce((s, c) => s + c.lng, 0) / cityList.length,
        ]
      : [47, 11.2];

  return (
    <MapContainer
      center={center}
      zoom={6}
      className="w-full h-full"
      zoomControl={false}
      attributionControl={false}
      dragging={false}
      scrollWheelZoom={false}
      doubleClickZoom={false}
      touchZoom={false}
      keyboard={false}
    >
      <TileLayer
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        attribution=""
        className="grayscale-tiles"
      />
      <FitBounds cities={cityList} />
      {cityList.map((city) => (
        <Marker
          key={city.name}
          position={[city.lat, city.lng]}
          icon={pinIcon}
        />
      ))}
    </MapContainer>
  );
}
