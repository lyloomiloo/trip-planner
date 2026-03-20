"use client";

import { useState, useEffect, useCallback } from "react";
import { useItineraryGenerator } from "@/hooks/useItineraryGenerator";
import { searchImages, type SearchResult } from "@/lib/images";
import type { TripPreferences } from "@/types/generation";
import type { ItineraryData } from "@/types/itinerary";

interface AITripWizardProps {
  onBack: () => void;
  onComplete: (data: ItineraryData, title: string, startDate: string) => void;
}

const DESTINATION_SUGGESTIONS = [
  "Swiss Alps", "Southeast Asia", "Japan", "Italy", "Scandinavia",
  "Central Asia", "Balkans", "New Zealand", "Patagonia", "Morocco",
];
const BUDGET_OPTIONS: TripPreferences["budget"][] = ["budget", "mid-range", "luxury"];
const HOLIDAY_SUGGESTIONS = [
  "Family", "Romance / Honeymoon", "Active / Nature", "Sightseeing",
  "Food & Culture", "Beach & Relax", "Road Trip", "Backpacking", "Mixed",
];
const CRITERIA_SUGGESTIONS = [
  "Second visit", "No touristy stuff", "Kid-friendly", "Wheelchair accessible",
  "Vegetarian-friendly", "Nightlife", "Off the beaten path", "Photography spots",
  "Local experiences", "Budget airlines only",
];

export default function AITripWizard({ onBack, onComplete }: AITripWizardProps) {
  const gen = useItineraryGenerator();

  // Form state
  const [region, setRegion] = useState("");
  const [budget, setBudget] = useState<TripPreferences["budget"]>("mid-range");
  const [holidayType, setHolidayType] = useState("");
  const [duration, setDuration] = useState(7);
  const [travellers, setTravellers] = useState(2);
  const [origin, setOrigin] = useState("");
  const [otherCriteria, setOtherCriteria] = useState("");
  const [tripTitle, setTripTitle] = useState("");
  const [startDate, setStartDate] = useState("");

  // City preview images — keyed by city name
  const [cityImages, setCityImages] = useState<Record<string, SearchResult[]>>({});

  // Fetch images when cities change
  const fetchCityImages = useCallback(async (cities: { name: string; activities?: { title: string }[][] }[]) => {
    for (const city of cities) {
      if (cityImages[city.name]) continue; // already fetched
      // Pick activity-specific queries, not just city name
      const activityNames = (city.activities || [])
        .flat()
        .map((a) => (typeof a === "string" ? a : a?.title || ""))
        .filter(Boolean)
        .slice(0, 2);
      const queries = activityNames.length > 0
        ? activityNames.map((a) => `${a} ${city.name}`)
        : [`${city.name} travel`, `${city.name} landmark`, `${city.name} nature`];

      try {
        const allResults: SearchResult[] = [];
        for (const q of queries.slice(0, 3)) {
          const results = await searchImages(q, 1);
          if (results.length > 0) allResults.push(results[0]);
          if (allResults.length >= 3) break;
        }
        // Fallback: if we got less than 3, fill with generic city search
        if (allResults.length < 3) {
          const fallback = await searchImages(`${city.name} travel`, 3 - allResults.length);
          allResults.push(...fallback);
        }
        setCityImages((prev) => ({ ...prev, [city.name]: allResults.slice(0, 3) }));
      } catch {
        // silent — images are optional
      }
    }
  }, [cityImages]);

  useEffect(() => {
    if (gen.step === "reviewing" && gen.currentSuggestion) {
      fetchCityImages(gen.currentSuggestion.cities as { name: string; activities?: { title: string }[][] }[]);
    }
  }, [gen.step, gen.currentSuggestion, fetchCityImages]);

  // Auto-detect user location on mount
  useEffect(() => {
    if (origin) return; // already set
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          const res = await fetch(
            `https://nominatim.openstreetmap.org/reverse?lat=${pos.coords.latitude}&lon=${pos.coords.longitude}&format=json&zoom=10`
          );
          const data = await res.json();
          const city = data.address?.city || data.address?.town || data.address?.state || "";
          if (city) setOrigin(city);
        } catch { /* silent */ }
      },
      () => { /* denied or error — silent */ },
      { timeout: 5000 }
    );
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const canGenerate = region.trim() && origin.trim() && duration > 0 && startDate;

  const handleGenerate = () => {
    gen.generateCities({
      region: region.trim(),
      budget,
      holidayType,
      duration,
      travellers,
      origin: origin.trim(),
      startDate,
      otherCriteria: otherCriteria.trim(),
    });
  };

  const handleComplete = () => {
    if (!startDate) return;
    // Auto-generate title from region + year
    const year = new Date(startDate + "T12:00:00").getFullYear();
    const autoTitle = `${region.trim() || "Trip"} ${year}`;
    const data = gen.getItineraryData(autoTitle, startDate);
    if (data) {
      onComplete(data, autoTitle, startDate);
    }
  };

  const inputClass = "w-full border-b-2 border-black bg-transparent py-2 text-sm font-bold uppercase tracking-wide text-black placeholder:text-black/20 focus:outline-none";
  const labelClass = "block text-[10px] font-bold uppercase tracking-widest text-black/40 mb-2";
  const pillClass = (active: boolean) =>
    `px-4 py-2 text-[10px] font-bold uppercase tracking-widest border-2 transition-colors ${
      active
        ? "border-black bg-black text-white"
        : "border-black/20 bg-white text-black/40 hover:border-black hover:text-black"
    }`;

  return (
    <div className="relative h-screen w-full overflow-hidden bg-white">
      <button
        onClick={() => {
          if (gen.step === "idle") {
            onBack();
          } else {
            gen.goBackStep();
          }
        }}
        className="absolute top-8 left-8 z-10 text-xs font-bold uppercase tracking-widest text-black/40 hover:text-black"
      >
        &larr; Back
      </button>

      <div className="h-full flex flex-col items-center justify-start overflow-y-auto py-20 px-4">
        <h1 className="text-[5vw] font-black uppercase tracking-tighter leading-none text-black mb-10">
          AI PLANNER
        </h1>

        {/* ─── STEP 1: Preferences Form ─── */}
        {gen.step === "idle" && (
          <div className="w-full max-w-lg space-y-6">
            {/* Region */}
            <div>
              <label className={labelClass}>Destination / Region</label>
              <input
                type="text"
                value={region}
                onChange={(e) => setRegion(e.target.value)}
                placeholder="e.g. Swiss Alps, Southeast Asia, Surprise me"
                className={inputClass}
              />
              <div className="flex gap-1.5 mt-2 overflow-x-auto pb-1 scrollbar-hide">
                {DESTINATION_SUGGESTIONS.map((s) => (
                  <button
                    key={s}
                    onClick={() => setRegion(s)}
                    className={`shrink-0 px-3 py-1 text-[9px] font-bold uppercase tracking-widest border transition-colors ${
                      region === s
                        ? "border-black bg-black text-white"
                        : "border-black/15 text-black/35 hover:border-black/40 hover:text-black/60"
                    }`}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>

            {/* Budget */}
            <div>
              <label className={labelClass}>Budget</label>
              <div className="flex gap-2">
                {BUDGET_OPTIONS.map((b) => (
                  <button key={b} onClick={() => setBudget(b)} className={pillClass(budget === b)}>
                    {b}
                  </button>
                ))}
              </div>
            </div>

            {/* Holiday type — input with scrollable suggestions */}
            <div>
              <label className={labelClass}>Holiday Type</label>
              <input
                type="text"
                value={holidayType}
                onChange={(e) => setHolidayType(e.target.value)}
                placeholder="e.g. Family, Romance, Active..."
                className={inputClass}
              />
              <div className="flex gap-1.5 mt-2 overflow-x-auto pb-1 scrollbar-hide">
                {HOLIDAY_SUGGESTIONS.map((s) => (
                  <button
                    key={s}
                    onClick={() => setHolidayType(s)}
                    className={`shrink-0 px-3 py-1 text-[9px] font-bold uppercase tracking-widest border transition-colors ${
                      holidayType === s
                        ? "border-black bg-black text-white"
                        : "border-black/15 text-black/35 hover:border-black/40 hover:text-black/60"
                    }`}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>

            {/* Start Date + Duration + Travellers */}
            <div className="flex gap-6">
              <div className="flex-1">
                <label className={labelClass}>Start Date</label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full border-b-2 border-black bg-transparent py-2 text-sm font-mono text-black focus:outline-none"
                />
              </div>
              <div className="w-28">
                <label className={labelClass}>Days</label>
                <div className="flex items-center border-b-2 border-black">
                  <button
                    onClick={() => setDuration(Math.max(1, duration - 1))}
                    className="text-black/30 hover:text-black text-lg px-2 py-2"
                  >
                    −
                  </button>
                  <span className="text-lg font-mono text-center flex-1 py-2">{duration}</span>
                  <button
                    onClick={() => setDuration(duration + 1)}
                    className="text-black/30 hover:text-black text-lg px-2 py-2"
                  >
                    +
                  </button>
                </div>
              </div>
              <div className="w-28">
                <label className={labelClass}>Travellers</label>
                <div className="flex items-center border-b-2 border-black">
                  <button
                    onClick={() => setTravellers(Math.max(1, travellers - 1))}
                    className="text-black/30 hover:text-black text-lg px-2 py-2"
                  >
                    −
                  </button>
                  <span className="text-lg font-mono text-center flex-1 py-2">{travellers}</span>
                  <button
                    onClick={() => setTravellers(travellers + 1)}
                    className="text-black/30 hover:text-black text-lg px-2 py-2"
                  >
                    +
                  </button>
                </div>
              </div>
            </div>

            {/* Origin */}
            <div>
              <label className={labelClass}>Flying From</label>
              <input
                type="text"
                value={origin}
                onChange={(e) => setOrigin(e.target.value)}
                placeholder="e.g. Singapore"
                className={inputClass}
              />
            </div>

            {/* Other criteria — single line input with scrollable suggestions */}
            <div>
              <label className={labelClass}>Other Requests (optional)</label>
              <input
                type="text"
                value={otherCriteria}
                onChange={(e) => setOtherCriteria(e.target.value)}
                placeholder="e.g. Must include Hallstatt, exclude Paris..."
                className={inputClass}
              />
              <div className="flex gap-1.5 mt-2 overflow-x-auto pb-1 scrollbar-hide">
                {CRITERIA_SUGGESTIONS.map((s) => (
                  <button
                    key={s}
                    onClick={() => setOtherCriteria((prev) => {
                      if (prev.includes(s)) return prev;
                      return prev ? `${prev}, ${s}` : s;
                    })}
                    className="shrink-0 px-3 py-1 text-[9px] font-bold uppercase tracking-widest border border-black/15 text-black/35 hover:border-black/40 hover:text-black/60 transition-colors"
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>

            {/* Error */}
            {gen.error && (
              <div className="border-2 border-black bg-neutral-50 p-4 text-center">
                <p className="text-sm font-black uppercase tracking-wide text-black">
                  🐯 Slow down, tiger!
                </p>
                <p className="text-xs text-neutral-500 mt-1">
                  The AI needs a break (i.e. we&apos;ve run out of credits). Try again tomorrow.
                </p>
              </div>
            )}

            {/* Generate button */}
            <button
              onClick={handleGenerate}
              disabled={!canGenerate}
              className={`w-full py-3 text-xs font-bold uppercase tracking-widest border-2 border-black ${
                canGenerate
                  ? "bg-black text-white hover:bg-neutral-800"
                  : "bg-neutral-100 text-black/30 border-black/20 cursor-not-allowed"
              }`}
            >
              Generate Itinerary
            </button>
          </div>
        )}

        {/* ─── STEP 2: City Suggestions Review ─── */}
        {gen.step === "reviewing" && gen.currentSuggestion && (
          <div className="w-full max-w-2xl">
            {/* Navigation */}
            <div className="flex items-center justify-between mb-6">
              <p className="text-[10px] font-bold uppercase tracking-widest text-black/40">
                Suggestion {gen.currentIndex + 1} of {gen.suggestions.length}
              </p>
              <div className="flex gap-2">
                <button
                  onClick={gen.goBack}
                  disabled={gen.currentIndex === 0}
                  className="text-[10px] font-bold uppercase tracking-widest text-black/30 hover:text-black disabled:text-black/10"
                >
                  &larr; Prev
                </button>
                <button
                  onClick={gen.goForward}
                  disabled={gen.currentIndex >= gen.suggestions.length - 1}
                  className="text-[10px] font-bold uppercase tracking-widest text-black/30 hover:text-black disabled:text-black/10"
                >
                  Next &rarr;
                </button>
              </div>
            </div>

            {/* City cards with transport blocks */}
            <div className="space-y-2 mb-8">
              {gen.currentSuggestion.cities.map((city, i) => {
                const MODE_EMOJI: Record<string, string> = { flight: "✈", train: "🚂", bus: "🚌", car: "🚗", ferry: "⛴" };
                const visibleActivities = city.activities
                  ? city.activities.slice(0, city.nights)
                  : [];

                return (
                  <div key={i}>
                    {/* Transport block */}
                    {city.transportIn && (
                      <div className="flex items-center gap-3 py-3 px-5 bg-neutral-100 border border-neutral-200 mb-2">
                        <span className="text-base">{MODE_EMOJI[city.transportIn.mode] || "🚀"}</span>
                        <span className="text-sm font-bold uppercase tracking-wide text-neutral-600">
                          {city.transportIn.mode} {city.transportIn.from} → {city.transportIn.to}
                        </span>
                        <span className="text-xs text-neutral-400 ml-auto">
                          {city.transportIn.durationHrs}h &middot; ~S${city.transportIn.costEstimate}/pax
                        </span>
                      </div>
                    )}

                    {/* City card */}
                    <div className="border-2 border-black p-5 relative group/card">
                      <div className="flex items-start justify-between">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-3">
                            <h3 className="text-2xl font-black uppercase tracking-tight">{city.name}</h3>
                            <span className="retro-label">{city.country}</span>
                          </div>
                          <p className="text-sm text-neutral-500 mt-2 leading-relaxed">{city.reason}</p>

                          {/* Daily activities — each day removable */}
                          {visibleActivities.length > 0 && (
                            <div className="mt-4 space-y-2">
                              {visibleActivities.map((dayActs, d) => (
                                <div
                                  key={d}
                                  draggable
                                  onDragStart={(e) => { e.dataTransfer.setData("text/plain", `${i}-${d}`); }}
                                  onDragOver={(e) => e.preventDefault()}
                                  onDrop={(e) => {
                                    e.preventDefault();
                                    const [srcCity, srcDay] = e.dataTransfer.getData("text/plain").split("-").map(Number);
                                    if (srcCity !== i || srcDay === d) return;
                                    const updated = [...gen.currentSuggestion!.cities];
                                    const acts = [...(updated[i].activities || [])];
                                    const [moved] = acts.splice(srcDay, 1);
                                    acts.splice(d, 0, moved);
                                    updated[i] = { ...updated[i], activities: acts };
                                    gen.updateCurrentCities(updated);
                                  }}
                                  className="flex gap-2 items-center group/dayrow"
                                >
                                  {/* Drag handle */}
                                  <span className="opacity-0 group-hover/dayrow:opacity-30 cursor-grab text-sm select-none shrink-0">⠿</span>
                                  <div className="flex-1">
                                    <p className="text-[9px] font-bold uppercase tracking-widest text-neutral-400 mb-1">Day {d + 1}</p>
                                    <div className="flex flex-wrap gap-1.5">
                                      {(Array.isArray(dayActs) ? dayActs : []).map((act, a) => {
                                        const actTitle = typeof act === "string" ? act : act?.title || "";
                                        return (
                                          <span key={a} className="text-[10px] font-bold uppercase tracking-widest bg-neutral-100 px-2 py-1 text-neutral-500">
                                            {actTitle}
                                          </span>
                                        );
                                      })}
                                    </div>
                                  </div>
                                  {/* Remove day — box with ✕ on right, vertically centered */}
                                  {visibleActivities.length > 1 && (
                                    <button
                                      onClick={() => {
                                        const updated = [...gen.currentSuggestion!.cities];
                                        const newActivities = [...(updated[i].activities || [])];
                                        newActivities.splice(d, 1);
                                        const oldNights = updated[i].nights;
                                        const newNights = Math.max(1, oldNights - 1);
                                        const ratio = newNights / oldNights;
                                        const oldCost = updated[i].costEstimate;
                                        const newCost = oldCost ? {
                                          accommodation: Math.round(oldCost.accommodation * ratio),
                                          food: Math.round(oldCost.food * ratio),
                                          activities: Math.round(oldCost.activities * ratio),
                                          transport: oldCost.transport,
                                        } : oldCost;
                                        updated[i] = { ...updated[i], activities: newActivities, nights: newNights, costEstimate: newCost };
                                        gen.updateCurrentCities(updated);
                                      }}
                                      className="shrink-0 w-6 h-6 border border-neutral-200 flex items-center justify-center text-neutral-300 hover:border-red-400 hover:text-red-500 transition-colors"
                                      title="Remove this day"
                                    >
                                      ✕
                                    </button>
                                  )}
                                </div>
                              ))}
                              {/* Add day to this city */}
                              <button
                                onClick={() => {
                                  const updated = [...gen.currentSuggestion!.cities];
                                  const oldNights = updated[i].nights;
                                  const newNights = oldNights + 1;
                                  const ratio = newNights / oldNights;
                                  const oldCost = updated[i].costEstimate;
                                  const newCost = oldCost ? {
                                    accommodation: Math.round(oldCost.accommodation * ratio),
                                    food: Math.round(oldCost.food * ratio),
                                    activities: Math.round(oldCost.activities * ratio),
                                    transport: oldCost.transport,
                                  } : oldCost;
                                  const newActivities = [...(updated[i].activities || []), [{ title: "Free day", type: "rest" as const }]];
                                  updated[i] = { ...updated[i], activities: newActivities, nights: newNights, costEstimate: newCost };
                                  gen.updateCurrentCities(updated);
                                }}
                                className="mt-2 text-[9px] font-bold uppercase tracking-widest text-neutral-300 hover:text-neutral-500 transition-colors"
                              >
                                + Add Day
                              </button>
                            </div>
                          )}
                        </div>

                        <div className="shrink-0 ml-4 flex flex-col items-center">
                          {/* Nights counter (read-only) */}
                          <span className="text-lg font-mono">{city.nights}</span>
                          <span className="text-[8px] font-bold uppercase tracking-widest text-black/20">nights</span>

                          {/* Cost per city */}
                          {city.costEstimate && (
                            <p className="text-[9px] text-neutral-400 mt-2 text-center">
                              ~S${Object.values(city.costEstimate).reduce((s, v) => s + (v || 0), 0)}/pax
                            </p>
                          )}

                          {/* Remove city */}
                          {gen.currentSuggestion!.cities.length > 1 && (
                            <button
                              onClick={() => {
                                const updated = gen.currentSuggestion!.cities.filter((_, j) => j !== i);
                                gen.updateCurrentCities(updated);
                              }}
                              className="mt-3 px-3 py-1.5 text-[9px] font-bold uppercase tracking-widest border-2 border-neutral-200 text-neutral-400 hover:border-red-400 hover:text-red-500 transition-colors"
                            >
                              Remove
                            </button>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* City preview images */}
                    {cityImages[city.name] && cityImages[city.name].length > 0 && (
                      <div className="flex gap-2 mt-2">
                        {cityImages[city.name].map((img, j) => (
                          <div key={j} className="flex-1 max-w-[33.333%] h-24 overflow-hidden bg-neutral-100">
                            <img
                              src={img.thumbUrl || img.url}
                              alt={img.alt}
                              className="w-full h-full object-cover"
                              loading="lazy"
                            />
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Add city via AI */}
            <button
              onClick={gen.addCityViaAI}
              disabled={gen.isAddingCity}
              className="w-full py-3 mb-6 text-[10px] font-bold uppercase tracking-widest border-2 border-dashed border-black/20 text-black/30 hover:border-black/40 hover:text-black/60 disabled:opacity-40"
            >
              {gen.isAddingCity ? "Adding city..." : "+ Add City"}
            </button>

            {/* Summary + total cost */}
            {(() => {
              const cities = gen.currentSuggestion.cities;
              const totalNights = cities.reduce((s, c) => s + c.nights, 0);
              const totalCost = cities.reduce((s, c) => {
                const cityCost = c.costEstimate ? Object.values(c.costEstimate).reduce((a, v) => a + (v || 0), 0) : 0;
                const transportCost = c.transportIn?.costEstimate || 0;
                return s + cityCost + transportCost;
              }, 0);
              return (
                <div className="text-sm font-bold uppercase tracking-widest text-black/30 flex items-center gap-4 mb-6">
                  <span>{totalNights} nights</span>
                  <span className="text-black/10">|</span>
                  <span>{cities.length} cities</span>
                  <span className="text-black/10">|</span>
                  <span>{cities.map((c) => c.name.toUpperCase()).join(" → ")}</span>
                  {totalCost > 0 && (
                    <>
                      <span className="text-black/10">|</span>
                      <span className="text-black/50">~S${totalCost.toLocaleString()}/pax</span>
                    </>
                  )}
                </div>
              );
            })()}

            {/* Error */}
            {gen.error && (
              <div className="border-2 border-black bg-neutral-50 p-4 text-center mb-4">
                <p className="text-sm font-black uppercase tracking-wide text-black">
                  🐯 Slow down, tiger!
                </p>
                <p className="text-xs text-neutral-500 mt-1">
                  The AI needs a break (i.e. we&apos;ve run out of credits). Try again tomorrow.
                </p>
              </div>
            )}

            {/* Action buttons */}
            <div className="flex gap-3">
              <button
                onClick={gen.reshuffleCities}
                className="flex-1 py-3 text-xs font-bold uppercase tracking-widest border-2 border-dashed border-black bg-white hover:bg-neutral-50 text-black"
              >
                Generate New
              </button>
              <button
                onClick={gen.confirmCities}
                className="flex-1 py-3 text-xs font-bold uppercase tracking-widest border-2 border-black bg-black text-white hover:bg-neutral-800"
              >
                Confirm Cities
              </button>
            </div>
          </div>
        )}

        {/* (loading screens moved outside this container) */}

        {/* ─── STEP 4: Complete — finalize trip ─── */}
        {gen.step === "complete" && gen.currentSuggestion?.schedule && (
          <div className="w-full max-w-lg space-y-6">
            <h2 className="text-3xl font-black uppercase tracking-tighter text-black">Summary</h2>

            <div className="border-2 border-black p-5">
              <p className="text-[10px] font-bold uppercase tracking-widest text-black/40 mb-3">
                {gen.currentSuggestion.schedule.length} days ready
              </p>
              <div className="space-y-1 max-h-60 overflow-y-auto">
                {gen.currentSuggestion.schedule.map((day, idx) => (
                  <div key={idx} className="flex items-center gap-3 text-xs">
                    <span className="font-bold text-black/30 w-12 shrink-0">Day {idx + 1}</span>
                    <span className="font-bold uppercase tracking-wide">{day.cityName}</span>
                    <span className="text-black/30 flex-1 text-right truncate">{day.route}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => gen.confirmCities()}
                className="flex-1 py-3 text-xs font-bold uppercase tracking-widest border-2 border-dashed border-black bg-white hover:bg-neutral-50 text-black"
              >
                Regenerate Schedule
              </button>
              <button
                onClick={handleComplete}
                className="flex-1 py-3 text-xs font-bold uppercase tracking-widest border-2 border-black bg-black text-white hover:bg-neutral-800"
              >
                Create Trip
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ─── Full-screen loading overlays ─── */}
      {(gen.step === "generating-cities" || gen.step === "generating-schedule" || gen.isAddingCity) && (
        <div className="absolute inset-0 z-50 bg-white flex flex-col items-center justify-center">
          <AsciiLoader />
          <p className="text-sm font-black uppercase tracking-widest text-black/40 mt-8">
            {gen.step === "generating-cities"
              ? "Finding the perfect cities..."
              : gen.isAddingCity
              ? "Adding a new city..."
              : "Building your day-by-day schedule..."}
          </p>
          <p className="text-[10px] text-black/20 mt-2 uppercase tracking-widest">
            {gen.step === "generating-cities"
              ? "Matching preferences with destinations"
              : gen.isAddingCity
              ? "Finding the best fit for your itinerary"
              : "Transport, meals, activities & accommodation"}
          </p>
        </div>
      )}
    </div>
  );
}

/** Cute ASCII globe spinner */
function AsciiLoader() {
  const frames = [
    `    .-""-.
  .'  ✈   '.
 /  O    o  \\
|    .---.   |
 \\  '___'  /
  '.     .'
    '---'`,
    `    .-""-.
  .'   ✈  '.
 / o    O   \\
|   .---.    |
 \\  '___'  /
  '.     .'
    '---'`,
    `    .-""-.
  .'      '.
 /  O  ✈   \\
|    .---.   |
 \\  '___'  /
  '.     .'
    '---'`,
    `    .-""-.
  .'      '.
 /  o    O  \\
|   .---. ✈ |
 \\  '___'  /
  '.     .'
    '---'`,
    `    .-""-.
  .'      '.
 /  O    o  \\
|    .---.   |
 \\ ✈'___'  /
  '.     .'
    '---'`,
    `    .-""-.
  .' ✈    '.
 /  o    O  \\
|    .---.   |
 \\  '___'  /
  '.     .'
    '---'`,
  ];

  const [frame, setFrame] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setFrame((f) => (f + 1) % frames.length), 300);
    return () => clearInterval(id);
  }, [frames.length]);

  return (
    <pre className="text-2xl leading-tight font-mono text-black/25 select-none">
      {frames[frame]}
    </pre>
  );
}
