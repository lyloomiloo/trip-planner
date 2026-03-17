"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import type { ItineraryData, CityData } from "@/types/itinerary";

// Dynamic import — Leaflet accesses `window` so it can't SSR
const CoverMap = dynamic(() => import("./CoverMap"), { ssr: false });

// Positions for the 4 title words — deliberately offset, not aligned
const POSITIONS: { top: string; left: string; fontSize: string }[] = [
  { top: "6%", left: "2%", fontSize: "14vw" },
  { top: "32%", left: "48%", fontSize: "16vw" },
  { top: "58%", left: "4%", fontSize: "14vw" },
  { top: "62%", left: "58%", fontSize: "16vw" },
];

interface CoverSlideProps {
  data: ItineraryData;
  onEditTitle?: (newTitle: string[]) => void;
  onAddCity?: (cityId: string, city: CityData) => void;
  onRemoveCity?: (cityId: string) => void;
}

export default function CoverSlide({
  data,
  onEditTitle,
  onAddCity,
  onRemoveCity,
}: CoverSlideProps) {
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [editValue, setEditValue] = useState("");
  const [showPinEditor, setShowPinEditor] = useState(false);
  const [newCityName, setNewCityName] = useState("");
  const [newCityLat, setNewCityLat] = useState("");
  const [newCityLng, setNewCityLng] = useState("");
  const [geocoding, setGeocoding] = useState(false);

  const allCities = data.cities;

  // Auto-geocode city name using OpenStreetMap Nominatim (free, no key)
  const geocodeCity = async (name: string) => {
    if (!name.trim()) return;
    setGeocoding(true);
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(name)}&format=json&limit=1`
      );
      const results = await res.json();
      if (results?.[0]) {
        setNewCityLat(parseFloat(results[0].lat).toFixed(4));
        setNewCityLng(parseFloat(results[0].lon).toFixed(4));
      }
    } catch { /* silent */ }
    setGeocoding(false);
  };

  const handleAddCity = () => {
    if (!newCityName.trim() || !newCityLat || !newCityLng || !onAddCity) return;
    const id = newCityName.toLowerCase().replace(/[^a-z0-9]+/g, "-");
    const name = newCityName.trim();
    onAddCity(id, {
      name,
      splitName: [
        name.substring(0, 3).toUpperCase(),
        name.substring(3).toUpperCase() || ".",
      ],
      country: "",
      countryLabel: "",
      lat: parseFloat(newCityLat),
      lng: parseFloat(newCityLng),
      description: "",
      mapZoom: 13,
    });
    setNewCityName("");
    setNewCityLat("");
    setNewCityLng("");
  };

  return (
    <section
      className="relative w-full overflow-hidden bg-neutral-200 snap-start"
      style={{ height: "var(--slide-h)", scrollSnapStop: "always" }}
    >
      {/* Map background — Leaflet with OpenStreetMap, pins placed natively */}
      <div className="absolute inset-0 pointer-events-none" style={{ zIndex: 0 }}>
        <CoverMap cities={allCities} />
      </div>

      {/* Scattered title words + hover buttons */}
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

        {/* Hover buttons — bottom-right */}
        {!isEditingTitle && !showPinEditor && (
          <div className="absolute bottom-6 right-6 z-20 flex gap-2 opacity-0 group-hover/cover:opacity-100 transition-opacity">
            {onEditTitle && (
              <button
                onClick={() => {
                  setEditValue(data.tripTitle.join(" "));
                  setIsEditingTitle(true);
                }}
                className="bg-black text-white text-[10px] font-bold uppercase tracking-widest px-3 py-1.5 hover:bg-neutral-800"
              >
                Edit Title
              </button>
            )}
            {onAddCity && (
              <button
                onClick={() => setShowPinEditor(true)}
                className="bg-black text-white text-[10px] font-bold uppercase tracking-widest px-3 py-1.5 hover:bg-neutral-800"
              >
                Edit Pins
              </button>
            )}
          </div>
        )}

        {/* Inline title editor */}
        {isEditingTitle && (
          <div className="absolute bottom-6 right-6 z-20 flex gap-2 items-center">
            <input
              autoFocus
              value={editValue}
              onChange={(e) => setEditValue(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  onEditTitle?.(
                    editValue
                      .toUpperCase()
                      .split(/\s+/)
                      .filter(Boolean)
                  );
                  setIsEditingTitle(false);
                }
                if (e.key === "Escape") setIsEditingTitle(false);
              }}
              className="bg-white border-2 border-black px-3 py-1.5 text-xs font-bold uppercase tracking-wider w-64 focus:outline-none"
              placeholder="EUROPE ALPS TOUR 2026"
            />
            <button
              onClick={() => {
                onEditTitle?.(
                  editValue
                    .toUpperCase()
                    .split(/\s+/)
                    .filter(Boolean)
                );
                setIsEditingTitle(false);
              }}
              className="bg-black text-white text-[10px] font-bold uppercase tracking-widest px-3 py-1.5 hover:bg-neutral-800"
            >
              Save
            </button>
            <button
              onClick={() => setIsEditingTitle(false)}
              className="text-[10px] font-bold uppercase tracking-widest text-black/40 hover:text-black px-2 py-1.5"
            >
              Cancel
            </button>
          </div>
        )}
      </div>

      {/* Pin editor panel */}
      {showPinEditor && (
        <div className="absolute bottom-6 right-6 z-30 bg-white border-2 border-black p-4 w-80 max-h-[60vh] overflow-y-auto">
          <div className="flex justify-between items-center mb-3">
            <span className="text-xs font-bold uppercase tracking-widest">
              Pinned Cities
            </span>
            <button
              onClick={() => setShowPinEditor(false)}
              className="text-xs font-bold text-black/40 hover:text-black"
            >
              Done
            </button>
          </div>

          {/* Existing cities */}
          <div className="space-y-1.5 mb-4">
            {Object.entries(allCities).map(([id, city]) => (
              <div
                key={id}
                className="flex items-center justify-between group/pin"
              >
                <div>
                  <span className="text-[11px] font-bold uppercase tracking-wide">
                    {city.name}
                  </span>
                  <span className="text-[9px] font-mono text-black/40 ml-2">
                    {city.lat.toFixed(2)}, {city.lng.toFixed(2)}
                  </span>
                </div>
                {onRemoveCity && (
                  <button
                    onClick={() => onRemoveCity(id)}
                    className="text-[10px] text-black/30 hover:text-red-600 opacity-0 group-hover/pin:opacity-100 transition-opacity"
                  >
                    &times;
                  </button>
                )}
              </div>
            ))}
          </div>

          {/* Add new city */}
          <div className="border-t border-black/10 pt-3 space-y-2">
            <span className="text-[9px] font-bold uppercase tracking-widest text-black/40">
              Add City
            </span>
            <input
              value={newCityName}
              onChange={(e) => setNewCityName(e.target.value)}
              onBlur={() => geocodeCity(newCityName)}
              onKeyDown={(e) => { if (e.key === "Enter") geocodeCity(newCityName); }}
              placeholder="City name"
              className="w-full border-b border-black/20 bg-transparent py-1 text-xs font-bold uppercase tracking-wide focus:outline-none focus:border-black"
            />
            <div className="flex gap-2">
              <input
                value={geocoding ? "..." : newCityLat}
                onChange={(e) => setNewCityLat(e.target.value)}
                placeholder="Latitude (auto)"
                type="number"
                step="0.0001"
                className="flex-1 border-b border-black/20 bg-transparent py-1 text-xs font-mono focus:outline-none focus:border-black"
              />
              <input
                value={geocoding ? "..." : newCityLng}
                onChange={(e) => setNewCityLng(e.target.value)}
                placeholder="Longitude (auto)"
                type="number"
                step="0.0001"
                className="flex-1 border-b border-black/20 bg-transparent py-1 text-xs font-mono focus:outline-none focus:border-black"
              />
            </div>
            <button
              onClick={handleAddCity}
              disabled={!newCityName.trim() || !newCityLat || !newCityLng}
              className="w-full py-1.5 text-[10px] font-bold uppercase tracking-widest bg-black text-white hover:bg-neutral-800 disabled:bg-neutral-200 disabled:text-neutral-400"
            >
              + Add Pin
            </button>
          </div>
        </div>
      )}

      {/* Bottom border */}
      <div className="absolute bottom-0 left-0 right-0 h-1 bg-black" />
    </section>
  );
}
