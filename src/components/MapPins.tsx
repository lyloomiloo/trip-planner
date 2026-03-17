"use client";

import type { CityData } from "@/types/itinerary";

// Map viewport bounds (approximate for Google Maps embed at zoom ~6-7, centered 47.0, 11.2)
const BOUNDS = {
  latMin: 44.5,
  latMax: 49.5,
  lngMin: 3.5,
  lngMax: 17.5,
};

function toPercent(city: CityData) {
  const x = ((city.lng - BOUNDS.lngMin) / (BOUNDS.lngMax - BOUNDS.lngMin)) * 100;
  const y = ((BOUNDS.latMax - city.lat) / (BOUNDS.latMax - BOUNDS.latMin)) * 100;
  return { left: `${x}%`, top: `${y}%` };
}

export default function MapPins({ cities }: { cities: Record<string, CityData> }) {
  return (
    <>
      {Object.values(cities).map((city) => {
        const pos = toPercent(city);
        return (
          <div
            key={city.name}
            className="absolute z-10 -translate-x-1/2 -translate-y-full pointer-events-none"
            style={{ left: pos.left, top: pos.top }}
          >
            {/* Pin SVG */}
            <svg width="18" height="24" viewBox="0 0 18 24" fill="none">
              <path
                d="M9 0C4.03 0 0 4.03 0 9c0 6.75 9 15 9 15s9-8.25 9-15c0-4.97-4.03-9-9-9z"
                fill="#C0392B"
              />
              <circle cx="9" cy="9" r="3.5" fill="#7B241C" />
            </svg>
          </div>
        );
      })}
    </>
  );
}
