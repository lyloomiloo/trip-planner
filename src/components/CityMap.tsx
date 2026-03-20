"use client";

import { MapContainer, TileLayer, Marker } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

const pinIcon = L.divIcon({
  html: `<svg width="24" height="32" viewBox="0 0 18 24" fill="none">
    <path d="M9 0C4.03 0 0 4.03 0 9c0 6.75 9 15 9 15s9-8.25 9-15c0-4.97-4.03-9-9-9z" fill="#C0392B"/>
    <circle cx="9" cy="9" r="3.5" fill="#7B241C"/>
  </svg>`,
  className: "",
  iconSize: [24, 32],
  iconAnchor: [12, 32],
});

interface CityMapProps {
  lat: number;
  lng: number;
  zoom: number;
}

export default function CityMap({ lat, lng, zoom }: CityMapProps) {
  return (
    <MapContainer
      center={[lat, lng]}
      zoom={zoom}
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
      <Marker position={[lat, lng]} icon={pinIcon} />
    </MapContainer>
  );
}
