"use client";

import { useMemo, useState } from "react";
import type { ItineraryData, CityData } from "@/types/itinerary";
import MapPins from "./MapPins";

// Positions for the 4 title words — deliberately offset, not aligned
const POSITIONS: { top: string; left: string; fontSize: string }[] = [
  { top: "6%", left: "2%", fontSize: "14vw" },    // EUROPE — top-left
  { top: "32%", left: "48%", fontSize: "16vw" },   // ALPS — center-right
  { top: "58%", left: "4%", fontSize: "14vw" },    // TOUR — bottom-left
  { top: "62%", left: "58%", fontSize: "16vw" },   // 2026 — bottom-right
];

interface CoverSlideProps {
  data: ItineraryData;
  onEditTitle?: (newTitle: string[]) => void;
}

export default function CoverSlide({ data, onEditTitle }: CoverSlideProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState("");
  const iframeSrc = `https://www.google.com/maps/embed?pb=!1m14!1m12!1m3!1d3000000!2d11.2!3d47.0!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!5e0!3m2!1sen!2s!4v1`;

  // Only show pins for cities that appear in the itinerary days
  const visitedCities = useMemo(() => {
    const cityIds = new Set(data.days.map((d) => d.cityId));
    const result: Record<string, CityData> = {};
    cityIds.forEach((id) => {
      if (data.cities[id]) result[id] = data.cities[id];
    });
    return result;
  }, [data.days, data.cities]);

  return (
    <section className="relative h-screen w-full overflow-hidden bg-neutral-200">
      {/* Map background — grayscale */}
      <iframe
        src={iframeSrc}
        className="absolute inset-0 w-full h-full border-0 pointer-events-none"
        style={{ filter: "grayscale(1) contrast(1.1)" }}
        loading="lazy"
        tabIndex={-1}
      />

      {/* Red city pins — only for cities in the itinerary */}
      <MapPins cities={visitedCities} />

      {/* Scattered title words */}
      <div className="group/cover">
        {data.tripTitle.map((word, i) => (
          <span
            key={`${word}-${i}`}
            className="absolute font-black uppercase leading-none text-black select-none"
            style={{
              top: POSITIONS[i]?.top ?? "50%",
              left: POSITIONS[i]?.left ?? "50%",
              fontSize: POSITIONS[i]?.fontSize ?? "12vw",
              letterSpacing: "-0.04em",
              zIndex: 10,
            }}
          >
            {word}
          </span>
        ))}

        {/* Edit title button — hover only */}
        {onEditTitle && !isEditing && (
          <button
            onClick={() => {
              setEditValue(data.tripTitle.join(" "));
              setIsEditing(true);
            }}
            className="absolute bottom-6 right-6 z-20 bg-black text-white text-[10px] font-bold uppercase tracking-widest px-3 py-1.5 opacity-0 group-hover/cover:opacity-100 transition-opacity hover:bg-neutral-800"
          >
            Edit Title
          </button>
        )}

        {/* Inline title editor */}
        {isEditing && (
          <div className="absolute bottom-6 right-6 z-20 flex gap-2 items-center">
            <input
              autoFocus
              value={editValue}
              onChange={(e) => setEditValue(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  onEditTitle?.(editValue.toUpperCase().split(/\s+/).filter(Boolean));
                  setIsEditing(false);
                }
                if (e.key === "Escape") setIsEditing(false);
              }}
              className="bg-white border-2 border-black px-3 py-1.5 text-xs font-bold uppercase tracking-wider w-64 focus:outline-none"
              placeholder="EUROPE ALPS TOUR 2026"
            />
            <button
              onClick={() => {
                onEditTitle?.(editValue.toUpperCase().split(/\s+/).filter(Boolean));
                setIsEditing(false);
              }}
              className="bg-black text-white text-[10px] font-bold uppercase tracking-widest px-3 py-1.5 hover:bg-neutral-800"
            >
              Save
            </button>
            <button
              onClick={() => setIsEditing(false)}
              className="text-[10px] font-bold uppercase tracking-widest text-black/40 hover:text-black px-2 py-1.5"
            >
              Cancel
            </button>
          </div>
        )}
      </div>

      {/* Bottom border */}
      <div className="absolute bottom-0 left-0 right-0 h-1 bg-black" />
    </section>
  );
}
