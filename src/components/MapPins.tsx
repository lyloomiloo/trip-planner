"use client";

import { useRef, useEffect, useState } from "react";
import type { CityData } from "@/types/itinerary";

interface MapPinsProps {
  cities: Record<string, CityData>;
  center: { lat: number; lng: number };
  zoom: number;
}

// Web Mercator: convert lng to world pixel X at given zoom
function lngToWorldX(lng: number, zoom: number) {
  return ((lng + 180) / 360) * 256 * Math.pow(2, zoom);
}

// Web Mercator: convert lat to world pixel Y at given zoom
function latToWorldY(lat: number, zoom: number) {
  const latRad = (lat * Math.PI) / 180;
  return (
    ((1 - Math.log(Math.tan(latRad) + 1 / Math.cos(latRad)) / Math.PI) / 2) *
    256 *
    Math.pow(2, zoom)
  );
}

export default function MapPins({ cities, center, zoom }: MapPinsProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ w: 1920, h: 1080 });

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const update = () => {
      setSize({ w: el.clientWidth, h: el.clientHeight });
    };
    update();
    const ro = new ResizeObserver(() => update());
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const centerWX = lngToWorldX(center.lng, zoom);
  const centerWY = latToWorldY(center.lat, zoom);

  return (
    <div
      ref={containerRef}
      className="absolute inset-0 pointer-events-none"
      style={{ zIndex: 10 }}
    >
      {Object.values(cities).map((city) => {
        const wx = lngToWorldX(city.lng, zoom);
        const wy = latToWorldY(city.lat, zoom);
        const dx = wx - centerWX;
        const dy = wy - centerWY;

        // Convert world pixel offset to % of container
        const leftPct = 50 + (dx / size.w) * 100;
        const topPct = 50 + (dy / size.h) * 100;

        if (leftPct < -5 || leftPct > 105 || topPct < -5 || topPct > 105)
          return null;

        return (
          <div
            key={city.name}
            className="absolute -translate-x-1/2 -translate-y-full"
            style={{ left: `${leftPct}%`, top: `${topPct}%` }}
          >
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
    </div>
  );
}
