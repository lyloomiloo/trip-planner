"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { loadTrip, saveTrip } from "@/lib/tripStore";
import { isSupabaseEnabled, loadTripFromRemote } from "@/lib/supabaseSync";
import { exportSlidesToPdf } from "@/lib/exportPdf";
import type { ItineraryData } from "@/types/itinerary";
import CoverSlide from "@/components/CoverSlide";
import CityIntroSlide from "@/components/CityIntroSlide";
import DaySlide from "@/components/DaySlide";
import SlideIndex from "@/components/SlideIndex";
import Overview from "@/components/Overview";

/** Shared view — permanently locked, no editing capabilities */
export default function SharePage() {
  const params = useParams();
  const router = useRouter();
  const tripId = params.id as string;
  const [trip, setTrip] = useState<ItineraryData | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [loading, setLoading] = useState(true);
  const [showOverview, setShowOverview] = useState(false);
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    async function load() {
      // Try localStorage first
      const local = loadTrip(tripId);
      if (local) {
        setTrip(local);
        setLoading(false);
        return;
      }

      // Try Supabase if enabled
      if (isSupabaseEnabled()) {
        const remote = await loadTripFromRemote(tripId);
        if (remote?.data) {
          const data = remote.data as ItineraryData;
          setTrip(data);
          // Cache locally for faster subsequent loads
          saveTrip(tripId, data);
          setLoading(false);
          return;
        }
      }

      setNotFound(true);
      setLoading(false);
    }
    load();
  }, [tripId]);

  // Build flat slide list — read directly from days array (matches main page logic)
  const flatSlides = useMemo(() => {
    if (!trip) return [];
    return trip.days.map((day, i) =>
      day.isCityIntro
        ? { type: "city-intro" as const, cityId: day.cityId, dayIndex: i }
        : { type: "day" as const, dayIndex: i }
    );
  }, [trip]);

  // Slide index entries
  const slideIndexEntries = useMemo(() => {
    if (!trip) return [];
    const entries: { id: string; label: string; sublabel?: string; type: "cover" | "city" | "day" }[] = [
      { id: "slide-cover", label: "Cover", type: "cover" },
    ];
    flatSlides.forEach((slide) => {
      if (slide.type === "city-intro") {
        const city = trip.cities[slide.cityId];
        entries.push({
          id: `slide-city-${slide.dayIndex}`,
          label: city?.name ?? slide.cityId,
          type: "city",
        });
      } else {
        const day = trip.days[slide.dayIndex];
        entries.push({
          id: `slide-day-${slide.dayIndex}`,
          label: `Day ${day.dayNumber}`,
          sublabel: day.weatherCityName || trip.cities[day.cityId]?.name || day.cityId,
          type: "day",
        });
      }
    });
    return entries;
  }, [flatSlides, trip]);

  // Longest city name for scaling
  const maxCityNameLength = useMemo(() => {
    if (!trip) return 1;
    const lengths = Object.values(trip.cities).map((c) => c.name.length);
    return Math.max(...lengths, 1);
  }, [trip]);

  if (notFound) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-4xl font-black uppercase tracking-tight mb-4">
            Trip Not Found
          </h1>
          <p className="text-sm text-neutral-400 uppercase tracking-widest mb-8">
            This trip may have been deleted or the link is invalid.
          </p>
          <button
            onClick={() => router.push("/")}
            className="bg-black text-white text-sm font-bold uppercase tracking-widest px-8 py-3 hover:bg-neutral-800"
          >
            Go Home
          </button>
        </div>
      </div>
    );
  }

  if (loading || !trip) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <p className="text-sm text-neutral-400 uppercase tracking-widest animate-pulse">
          Loading...
        </p>
      </div>
    );
  }

  // No-op handlers for DaySlide's required props (all editing is disabled via locked=true)
  const noop = () => {};
  const noop2 = (_a: number, _b: number) => {};
  const noop3 = (_a: number, _b: number, _c: number) => {};

  const handleExportPdf = async () => {
    if (!trip) return;
    setDownloading(true);
    const title = trip.tripTitle.join(" ").toLowerCase().replace(/\s+/g, "-");
    const cityLookup: Record<string, { lat: number; lng: number; mapZoom: number }> = {};
    Object.entries(trip.cities).forEach(([id, c]) => {
      cityLookup[id] = { lat: c.lat, lng: c.lng, mapZoom: c.mapZoom };
    });
    await exportSlidesToPdf("", "[data-slide]", `${title}.pdf`, cityLookup);
    setDownloading(false);
  };

  return (
    <main className="min-h-screen bg-white">
      {/* Minimal view-only toolbar */}
      <div
        className="sticky top-0 z-40 bg-white border-b-2 border-black flex items-center justify-between px-6"
        style={{ height: "var(--toolbar-h)" }}
      >
        <button
          onClick={() => router.push("/")}
          className="text-xs font-bold uppercase tracking-widest text-neutral-400 hover:text-black"
        >
          &larr; Home
        </button>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowOverview(true)}
            className="text-[10px] font-bold uppercase tracking-widest text-neutral-500 hover:text-black"
          >
            Overview
          </button>
          <span className="text-[10px] text-neutral-300">|</span>
          <button
            onClick={handleExportPdf}
            disabled={downloading}
            className="text-[10px] font-bold uppercase tracking-widest text-neutral-500 hover:text-black disabled:opacity-40"
          >
            {downloading ? "Exporting..." : "PDF"}
          </button>
        </div>
      </div>

      {/* Slide index */}
      <SlideIndex slides={slideIndexEntries} />

      {/* All slides in locked mode */}
      <div className="locked-itinerary">
        {/* Cover */}
        <div id="slide-cover" data-slide>
          <CoverSlide data={trip} />
        </div>

        {/* City intros + Day slides */}
        {flatSlides.map((slide) => {
          if (slide.type === "city-intro") {
            const city = trip.cities[slide.cityId];
            if (!city) return null;
            return (
              <div key={`city-${slide.cityId}`} id={`slide-city-${slide.dayIndex}`} data-slide>
                <CityIntroSlide
                  city={city}
                  cityId={slide.cityId}
                  maxCityNameLength={maxCityNameLength}
                />
              </div>
            );
          }

          const day = trip.days[slide.dayIndex];
          const city = trip.cities[day.cityId] ?? {
            name: day.cityId.replace(/-/g, " ").replace(/\b\w/g, c => c.toUpperCase()),
            splitName: ["", ""] as [string, string],
            country: "",
            countryLabel: "",
            lat: 47.0,
            lng: 8.0,
            description: "",
            mapZoom: 13,
          };
          return (
            <div key={`day-${day.dayNumber}-${slide.dayIndex}`} id={`slide-day-${slide.dayIndex}`} data-slide>
              <DaySlide
                day={day}
                city={city}
                dayIndex={slide.dayIndex}
                totalDays={trip.days.length}
                onUpdateEvent={noop2}
                onAddEvent={noop}
                onRemoveEvent={noop2}
                onReorderEvents={noop3}
                onUpdateGallerySlot={noop2}
                onAddGallerySlot={noop}
                onRemoveGallerySlot={noop2}
                onUpdateDayField={noop}
                onRemoveDay={noop}
                locked={true}
              />
            </div>
          );
        })}
      </div>

      {/* Overview modal — view-only, no editing handlers */}
      {showOverview && (
        <Overview
          data={trip}
          onClose={() => setShowOverview(false)}
          onMoveDay={noop2}
          onRemoveDay={noop}
        />
      )}
    </main>
  );
}
