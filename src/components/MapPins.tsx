"use client";

import type { CityData } from "@/types/itinerary";

// Map viewport bounds calibrated to Google Maps embed centered at (47.0, 11.2) with !1d3000000
// Calibrated using Vienna (~85%, ~22%) and Geneva (~19%, ~44%) as anchor points
const BOUNDS = {
  latMin: 42.0,
  latMax: 52.7,
  lngMin: 3.2,
  lngMax: 18.7,
};

// Mercator projection for accurate latitude positioning
function mercatorY(lat: number) {
  const latRad = (lat * Math.PI) / 180;
  return Math.log(Math.tan(Math.PI / 4 + latRad / 2));
}

const MERC_MAX = mercatorY(BOUNDS.latMax);
const MERC_MIN = mercatorY(BOUNDS.latMin);

function toPercent(city: CityData) {
  const x = ((city.lng - BOUNDS.lngMin) / (BOUNDS.lngMax - BOUNDS.lngMin)) * 100;
  const yMerc = mercatorY(city.lat);
  const y = ((MERC_MAX - yMerc) / (MERC_MAX - MERC_MIN)) * 100;
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
