"use client";

import { useMemo, useState } from "react";
import { useItinerary } from "@/hooks/useItinerary";
import { loadTrip, saveTrip, generateTripId, createBlankItinerary } from "@/lib/tripStore";
import LandingPage from "@/components/LandingPage";
import NewTripForm from "@/components/NewTripForm";
import CoverSlide from "@/components/CoverSlide";
import CityIntroSlide from "@/components/CityIntroSlide";
import DaySlide from "@/components/DaySlide";
import Toolbar from "@/components/Toolbar";
import type { ItineraryData } from "@/types/itinerary";

// Default trip ID for the bundled europe-alps itinerary
const DEFAULT_TRIP_ID = "europe-alps-tour";

export default function Home() {
  const [view, setView] = useState<"landing" | "new" | "trip">("landing");
  const [activeTripId, setActiveTripId] = useState<string>(DEFAULT_TRIP_ID);
  const [initialData, setInitialData] = useState<ItineraryData | undefined>(undefined);

  const {
    state,
    updateEvent,
    addEvent,
    removeEvent,
    reorderEvents,
    updateGallerySlot,
    addGallerySlot,
    removeGallerySlot,
    updateTitle,
    updateDayField,
    addDay,
    removeDay,
    moveDay,
    loadData,
    exportJSON,
    importJSON,
    reset,
  } = useItinerary(activeTripId, initialData);

  // Group days by city in visit order
  const cityGroups = useMemo(() => {
    const seen = new Set<string>();
    const groups: { cityId: string; dayIndices: number[] }[] = [];

    state.days.forEach((day, i) => {
      if (!seen.has(day.cityId)) {
        seen.add(day.cityId);
        groups.push({ cityId: day.cityId, dayIndices: [i] });
      } else {
        const group = groups.find((g) => g.cityId === day.cityId);
        group?.dayIndices.push(i);
      }
    });

    return groups;
  }, [state.days]);

  /** Open an existing trip from the store */
  const handleSelectTrip = (tripId: string) => {
    const data = loadTrip(tripId);
    if (data) {
      setActiveTripId(tripId);
      setInitialData(data);
      loadData(data);
    }
    setView("trip");
  };

  /** Open the default bundled trip (first time or no localStorage) */
  const handleOpenDefault = () => {
    setActiveTripId(DEFAULT_TRIP_ID);
    setInitialData(undefined); // uses bundled JSON
    setView("trip");
    // Save it to the store so it shows up in Continue Plan
    saveTrip(DEFAULT_TRIP_ID, state);
  };

  /** Create a blank trip from form data */
  const handleCreateBlank = (formData: { title: string; startDate: string; endDate: string; startCity: string; endCity: string }) => {
    const tripId = generateTripId(formData.title);
    const data = createBlankItinerary(formData);
    saveTrip(tripId, data);
    setActiveTripId(tripId);
    setInitialData(data);
    loadData(data);
    setView("trip");
  };

  /** Import a JSON file as a new trip */
  const handleImportAsNewTrip = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = JSON.parse(e.target?.result as string) as ItineraryData;
        const title = data.tripTitle?.join(" ") || "Imported Trip";
        const tripId = generateTripId(title);
        saveTrip(tripId, data);
        setActiveTripId(tripId);
        setInitialData(data);
        loadData(data);
        setView("trip");
      } catch {
        alert("Invalid JSON file");
      }
    };
    reader.readAsText(file);
  };

  /** Import JSON into the current trip (from toolbar) */
  const handleImportIntoCurrent = (file: File) => {
    importJSON(file);
  };

  const handleAddDay = () => {
    const lastDay = state.days[state.days.length - 1];
    const nextNum = lastDay ? lastDay.dayNumber + 1 : 1;
    const nextDate = lastDay
      ? (() => {
          const d = new Date(lastDay.date + "T00:00:00");
          d.setDate(d.getDate() + 1);
          return d.toISOString().split("T")[0];
        })()
      : "2026-03-26";
    const weekdays = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
    const nextWeekday = weekdays[new Date(nextDate + "T00:00:00").getDay()];

    addDay({
      dayNumber: nextNum,
      date: nextDate,
      weekday: nextWeekday,
      cityId: lastDay?.cityId ?? "city-1",
      route: "",
      accommodation: "",
      events: [],
      gallery: [
        { url: null, caption: null, size: "large", slot: "A" },
        { url: null, caption: null, size: "medium", slot: "B" },
      ],
    });
  };

  // Landing page
  if (view === "landing") {
    return (
      <LandingPage
        onSelectTrip={handleSelectTrip}
        onStartNew={() => setView("new")}
      />
    );
  }

  // New trip form
  if (view === "new") {
    return (
      <NewTripForm
        onBack={() => setView("landing")}
        onCreateBlank={handleCreateBlank}
        onImport={handleImportAsNewTrip}
      />
    );
  }

  // Trip view
  return (
    <main className="min-h-screen bg-white">
      {/* Top toolbar */}
      <Toolbar
        onExport={exportJSON}
        onImport={handleImportIntoCurrent}
        onReset={reset}
        onBack={() => setView("landing")}
      />

      {/* Cover Slide */}
      <CoverSlide data={state} onEditTitle={updateTitle} />

      {/* For each city: intro slide, then its day slides */}
      {cityGroups.map(({ cityId, dayIndices }) => {
        const city = state.cities[cityId];
        if (!city) return null;

        return (
          <div key={cityId}>
            {/* City intro slide */}
            <CityIntroSlide city={city} />

            {/* Day slides for this city */}
            {dayIndices.map((dayIndex) => {
              const day = state.days[dayIndex];
              return (
                <DaySlide
                  key={`${day.dayNumber}-${dayIndex}`}
                  day={day}
                  city={city}
                  dayIndex={dayIndex}
                  totalDays={state.days.length}
                  onUpdateEvent={updateEvent}
                  onAddEvent={addEvent}
                  onRemoveEvent={removeEvent}
                  onReorderEvents={reorderEvents}
                  onUpdateGallerySlot={updateGallerySlot}
                  onAddGallerySlot={addGallerySlot}
                  onRemoveGallerySlot={removeGallerySlot}
                  onUpdateDayField={updateDayField}
                  onMoveDay={moveDay}
                  onRemoveDay={removeDay}
                />
              );
            })}
          </div>
        );
      })}

      {/* ADD DAY — at the bottom of scroll */}
      <section className="flex items-center justify-center py-20 border-t-2 border-dashed border-neutral-300">
        <button
          onClick={handleAddDay}
          className="flex flex-col items-center gap-3 group"
        >
          <span className="text-5xl font-light text-neutral-300 group-hover:text-black transition-colors">+</span>
          <span className="text-xs font-bold uppercase tracking-widest text-neutral-400 group-hover:text-black transition-colors">
            Add Day
          </span>
        </button>
      </section>
    </main>
  );
}
