"use client";

import { useRef, useState } from "react";

export interface Destination {
  city: string;
  nights: number;
}

export interface NewTripData {
  title: string;
  startDate: string;
  origin: string;
  destinations: Destination[];
}

interface NewTripFormProps {
  onBack: () => void;
  onCreateBlank: (data: NewTripData) => void;
  onImport: (file: File) => void;
}

export default function NewTripForm({ onBack, onCreateBlank, onImport }: NewTripFormProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [title, setTitle] = useState("");
  const [startDate, setStartDate] = useState("");
  const [origin, setOrigin] = useState("");
  const [destinations, setDestinations] = useState<Destination[]>([
    { city: "", nights: 2 },
  ]);

  const addDestination = () => {
    setDestinations([...destinations, { city: "", nights: 2 }]);
  };

  const updateDestination = (index: number, field: keyof Destination, value: string | number) => {
    const updated = [...destinations];
    if (field === "nights") {
      updated[index] = { ...updated[index], nights: Math.max(1, Number(value)) };
    } else {
      updated[index] = { ...updated[index], city: String(value) };
    }
    setDestinations(updated);
  };

  const removeDestination = (index: number) => {
    if (destinations.length <= 1) return;
    setDestinations(destinations.filter((_, i) => i !== index));
  };

  const filledDestinations = destinations.filter((d) => d.city.trim());
  const totalNights = filledDestinations.reduce((sum, d) => sum + d.nights, 0);
  const canCreate = title.trim() && startDate && filledDestinations.length > 0;

  // Compute end date for display
  const endDateStr = startDate && totalNights > 0
    ? (() => {
        const d = new Date(startDate + "T12:00:00");
        d.setDate(d.getDate() + totalNights);
        return d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
      })()
    : "";

  return (
    <div className="relative h-screen w-full overflow-hidden bg-white">
      {/* Back button */}
      <button
        onClick={onBack}
        className="absolute top-8 left-8 z-10 text-xs font-bold uppercase tracking-widest text-black/40 hover:text-black"
      >
        &larr; Back
      </button>

      {/* Centered form — scrollable */}
      <div className="h-full flex flex-col items-center justify-center overflow-y-auto py-20">
        <h1 className="text-[6vw] font-black uppercase tracking-tighter leading-none text-black mb-12">
          NEW TRIP
        </h1>

        <div className="w-full max-w-lg space-y-6">
          {/* Title */}
          <div>
            <label className="block text-[10px] font-bold uppercase tracking-widest text-black/40 mb-2">
              Trip Title
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Europe Alps Tour 2026"
              className="w-full border-b-2 border-black bg-transparent py-2 text-lg font-bold uppercase tracking-wide text-black placeholder:text-black/20 focus:outline-none"
            />
          </div>

          {/* Start date + Origin row */}
          <div className="flex gap-6">
            <div className="flex-1">
              <label className="block text-[10px] font-bold uppercase tracking-widest text-black/40 mb-2">
                Start Date
              </label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full border-b-2 border-black bg-transparent py-2 text-sm font-mono text-black focus:outline-none"
              />
            </div>
            <div className="flex-1">
              <label className="block text-[10px] font-bold uppercase tracking-widest text-black/40 mb-2">
                Flying From
              </label>
              <input
                type="text"
                value={origin}
                onChange={(e) => setOrigin(e.target.value)}
                placeholder="e.g. Singapore"
                className="w-full border-b-2 border-black bg-transparent py-2 text-sm font-bold uppercase tracking-wide text-black placeholder:text-black/20 focus:outline-none"
              />
            </div>
          </div>

          {/* Destinations */}
          <div>
            <label className="block text-[10px] font-bold uppercase tracking-widest text-black/40 mb-3">
              Destinations
            </label>
            <div className="space-y-3">
              {destinations.map((dest, i) => (
                <div key={i} className="flex items-end gap-3 group/dest">
                  {/* City number */}
                  <span className="text-[10px] font-bold uppercase tracking-widest text-black/20 pb-2.5 shrink-0 w-5 text-right">
                    {i + 1}
                  </span>
                  {/* City name */}
                  <div className="flex-1">
                    <input
                      type="text"
                      value={dest.city}
                      onChange={(e) => updateDestination(i, "city", e.target.value)}
                      placeholder={i === 0 ? "e.g. Geneva" : "Next city..."}
                      className="w-full border-b-2 border-black/30 focus:border-black bg-transparent py-2 text-sm font-bold uppercase tracking-wide text-black placeholder:text-black/15 focus:outline-none"
                    />
                  </div>
                  {/* Nights */}
                  <div className="shrink-0 w-20">
                    <div className="flex items-center border-b-2 border-black/30">
                      <button
                        onClick={() => updateDestination(i, "nights", dest.nights - 1)}
                        className="text-black/30 hover:text-black text-sm px-1 py-2"
                      >
                        −
                      </button>
                      <span className="text-sm font-mono text-center flex-1 py-2">
                        {dest.nights}
                      </span>
                      <button
                        onClick={() => updateDestination(i, "nights", dest.nights + 1)}
                        className="text-black/30 hover:text-black text-sm px-1 py-2"
                      >
                        +
                      </button>
                    </div>
                    <span className="text-[8px] font-bold uppercase tracking-widest text-black/20 block text-center mt-0.5">
                      nights
                    </span>
                  </div>
                  {/* Remove */}
                  {destinations.length > 1 && (
                    <button
                      onClick={() => removeDestination(i)}
                      className="text-black/15 hover:text-red-500 text-sm pb-2.5 opacity-0 group-hover/dest:opacity-100 transition-opacity shrink-0"
                    >
                      ✕
                    </button>
                  )}
                </div>
              ))}
            </div>
            <button
              onClick={addDestination}
              className="mt-3 text-[10px] font-bold uppercase tracking-widest text-black/30 hover:text-black"
            >
              + Add destination
            </button>
          </div>

          {/* Summary line */}
          {filledDestinations.length > 0 && startDate && (
            <div className="text-[10px] font-bold uppercase tracking-widest text-black/30 flex items-center gap-3">
              <span>{totalNights} nights</span>
              <span className="text-black/10">|</span>
              <span>{filledDestinations.length} {filledDestinations.length === 1 ? "city" : "cities"}</span>
              <span className="text-black/10">|</span>
              <span>{filledDestinations.map((d) => d.city.toUpperCase()).join(" → ")}</span>
              {endDateStr && (
                <>
                  <span className="text-black/10">|</span>
                  <span>Ends {endDateStr}</span>
                </>
              )}
            </div>
          )}

          {/* Divider */}
          <div className="w-full h-px bg-black/10 my-2" />

          {/* Actions */}
          <div className="flex gap-4 pt-2">
            <button
              onClick={() => {
                if (canCreate) {
                  onCreateBlank({ title, startDate, origin, destinations: filledDestinations });
                }
              }}
              disabled={!canCreate}
              className={`flex-1 py-3 text-xs font-bold uppercase tracking-widest border-2 border-black ${
                canCreate
                  ? "bg-black text-white hover:bg-neutral-800"
                  : "bg-neutral-100 text-black/30 border-black/20 cursor-not-allowed"
              }`}
            >
              Create Trip
            </button>

            <div className="flex-1 relative group/upload">
              <button
                onClick={() => fileInputRef.current?.click()}
                className="w-full py-3 text-xs font-bold uppercase tracking-widest border-2 border-dashed border-black bg-white hover:bg-neutral-50 text-black"
              >
                Upload JSON
              </button>
              <div className="absolute left-0 right-0 top-full mt-2 bg-white border border-neutral-200 px-4 py-3 opacity-0 group-hover/upload:opacity-100 pointer-events-none transition-opacity shadow-sm z-10">
                <p className="text-[10px] text-neutral-400 leading-relaxed">
                  If you have an existing itinerary, upload it to an LLM and request for a JSON file output.
                </p>
              </div>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept=".json"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) onImport(file);
              }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
