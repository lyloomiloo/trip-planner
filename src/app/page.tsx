"use client";

import { useMemo, useState, useCallback, useEffect, useRef } from "react";
import { useItinerary } from "@/hooks/useItinerary";
import { loadTrip, saveTrip, generateTripId, createBlankItinerary } from "@/lib/tripStore";
import { generateCityDetails, queuePendingCity, removePendingCity, getPendingCities } from "@/lib/gemini";
import LandingPage from "@/components/LandingPage";
import NewTripForm from "@/components/NewTripForm";
import CoverSlide from "@/components/CoverSlide";
import CityIntroSlide from "@/components/CityIntroSlide";
import DaySlide from "@/components/DaySlide";
import Toolbar from "@/components/Toolbar";
import SlideIndex from "@/components/SlideIndex";
import Overview from "@/components/Overview";
import Toast from "@/components/Toast";
import type { ItineraryData } from "@/types/itinerary";

// Default trip ID for the bundled europe-alps itinerary
const DEFAULT_TRIP_ID = "europe-alps-tour";

export default function Home() {
  const [view, setView] = useState<"landing" | "new" | "trip">("landing");
  const [showOverview, setShowOverview] = useState(false);
  const [activeTripId, setActiveTripId] = useState<string>(DEFAULT_TRIP_ID);
  const [initialData, setInitialData] = useState<ItineraryData | undefined>(undefined);
  const [locked, setLocked] = useState(false);

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
    addCity,
    updateCity,
    removeCity,
    updateDayField,
    updateDayDate,
    updateDayWeatherLoc,
    addDay,
    removeDay,
    moveDay,
    loadData,
    importJSON,
    reset,
  } = useItinerary(activeTripId, initialData);

  // Handle deep-link from share page: ?trip=xxx&view=itinerary|overview
  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    const tripParam = params.get("trip");
    const viewParam = params.get("view");
    if (tripParam) {
      const data = loadTrip(tripParam);
      if (data) {
        setActiveTripId(tripParam);
        setInitialData(data);
        loadData(data);
        setView("trip");
        if (viewParam === "overview") {
          setShowOverview(true);
        }
        // Clean URL
        window.history.replaceState({}, "", "/");
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Longest city name — used to scale all city titles consistently
  const maxCityNameLength = useMemo(() => {
    const lengths = Object.values(state.cities).map((c) => c.name.length);
    return Math.max(...lengths, 1);
  }, [state.cities]);

  // Build a flat slide list: city intro inserted when cityId changes between consecutive days
  const flatSlides = useMemo(() => {
    const slides: ({ type: "city-intro"; cityId: string } | { type: "day"; dayIndex: number })[] = [];
    let lastCityId: string | null = null;

    state.days.forEach((day, i) => {
      if (day.cityId !== lastCityId) {
        slides.push({ type: "city-intro", cityId: day.cityId });
        lastCityId = day.cityId;
      }
      slides.push({ type: "day", dayIndex: i });
    });

    return slides;
  }, [state.days]);

  // Slide index entries for the scroll nav
  const slideIndexEntries = useMemo(() => {
    const entries: { id: string; label: string; sublabel?: string; type: "cover" | "city" | "day" }[] = [
      { id: "slide-cover", label: "Cover", type: "cover" },
    ];
    flatSlides.forEach((slide, i) => {
      if (slide.type === "city-intro") {
        const city = state.cities[slide.cityId];
        entries.push({
          id: `slide-city-${slide.cityId}-${i}`,
          label: city?.name ?? slide.cityId,
          type: "city",
        });
      } else {
        const day = state.days[slide.dayIndex];
        entries.push({
          id: `slide-day-${slide.dayIndex}`,
          label: `Day ${day.dayNumber}`,
          sublabel: day.cityId,
          type: "day",
        });
      }
    });
    return entries;
  }, [flatSlides, state.cities, state.days]);

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

  /** Create a blank trip from form data, geocode the destination */
  const handleCreateBlank = async (formData: { title: string; startDate: string; endDate: string; startCity: string; endCity: string }) => {
    const tripId = generateTripId(formData.title);
    const data = createBlankItinerary(formData);
    saveTrip(tripId, data);
    setActiveTripId(tripId);
    setInitialData(data);
    loadData(data);
    setView("trip");

    // Geocode the destination city in background so the pin appears on the map
    if (formData.endCity) {
      try {
        const res = await fetch(
          `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(formData.endCity)}&format=json&limit=1`
        );
        const results = await res.json();
        if (results?.[0]) {
          updateCity("city-1", {
            lat: parseFloat(results[0].lat),
            lng: parseFloat(results[0].lon),
          });
        }
      } catch { /* silent */ }

      // Also fire Gemini to populate city details
      const result = await generateCityDetails(formData.endCity);
      if (result.status === "ok") {
        updateCity("city-1", result.data);
      } else if (result.status === "rate-limited") {
        queuePendingCity("city-1", formData.endCity);
        showToast("The LLM is generating your summary — check back shortly");
      }
    }
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

  // Toast state
  const [toastMsg, setToastMsg] = useState("");
  const [toastVisible, setToastVisible] = useState(false);
  const showToast = useCallback((msg: string) => {
    setToastMsg(msg);
    setToastVisible(true);
  }, []);

  /** Share — copy share link to clipboard */
  const handleShare = useCallback(() => {
    const shareUrl = `${window.location.origin}/share/${activeTripId}`;
    navigator.clipboard.writeText(shareUrl).then(() => {
      showToast("Share link copied to clipboard");
    }).catch(() => {
      window.prompt("Share this link:", shareUrl);
    });
  }, [activeTripId, showToast]);

  // State for generating cities
  const [generatingCityId, setGeneratingCityId] = useState<string | null>(null);

  // Ref to track pending scroll-to after adding a day
  const pendingScrollRef = useRef<number | null>(null);

  /** Add a new city destination with Gemini-generated details (called from toolbar) */
  const handleAddCityDestination = useCallback(async (cityName: string) => {
    const id = cityName.toLowerCase().replace(/[^a-z0-9]+/g, "-");
    const name = cityName.trim();

    // Immediately add placeholder city + first day
    const placeholderCity = {
      name,
      splitName: [
        name.substring(0, Math.ceil(name.length / 2)).toUpperCase(),
        name.substring(Math.ceil(name.length / 2)).toUpperCase() || ".",
      ] as [string, string],
      country: "",
      countryLabel: "",
      lat: 47.0,
      lng: 8.0,
      description: "",
      mapZoom: 13,
    };
    addCity(id, placeholderCity);

    // Add first day for this city
    const lastDay = state.days[state.days.length - 1];
    const nextNum = lastDay ? lastDay.dayNumber + 1 : 1;
    const nextDate = lastDay
      ? (() => {
          const d = new Date(lastDay.date + "T12:00:00");
          d.setDate(d.getDate() + 1);
          return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
        })()
      : "2026-03-26";
    const weekdays = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
    const nextWeekday = weekdays[new Date(nextDate + "T12:00:00").getDay()];

    addDay({
      dayNumber: nextNum,
      date: nextDate,
      weekday: nextWeekday,
      cityId: id,
      route: "",
      accommodation: "",
      events: [],
      gallery: [
        { url: null, caption: null, size: "large", slot: "A" },
        { url: null, caption: null, size: "medium", slot: "B" },
      ],
    });

    // Auto-scroll to the new day after render
    pendingScrollRef.current = state.days.length;

    // Geocode city
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(name)}&format=json&limit=1`
      );
      const results = await res.json();
      if (results?.[0]) {
        updateCity(id, {
          lat: parseFloat(results[0].lat),
          lng: parseFloat(results[0].lon),
        });
      }
    } catch { /* silent */ }

    // Fetch Gemini details in background
    setGeneratingCityId(id);
    const result = await generateCityDetails(name);
    if (result.status === "ok") {
      updateCity(id, result.data);
      removePendingCity(id);
    } else if (result.status === "rate-limited") {
      queuePendingCity(id, name);
      showToast("The LLM is generating your summary — check back shortly");
    }
    setGeneratingCityId(null);
  }, [addCity, addDay, updateCity, showToast, state.days]);

  // Retry any queued cities on mount (user returned after rate limit)
  useEffect(() => {
    if (view !== "trip") return;
    const pending = getPendingCities();
    if (pending.length === 0) return;

    (async () => {
      for (const { cityId, cityName } of pending) {
        if (state.cities[cityId]?.description) {
          removePendingCity(cityId);
          continue;
        }
        setGeneratingCityId(cityId);
        const result = await generateCityDetails(cityName);
        if (result.status === "ok") {
          updateCity(cityId, result.data);
          removePendingCity(cityId);
        } else if (result.status === "rate-limited") {
          showToast("Still rate-limited — summaries will generate when the limit resets");
          break;
        }
        setGeneratingCityId(null);
      }
    })();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [view]);

  // Auto-scroll when pending
  useEffect(() => {
    if (pendingScrollRef.current !== null) {
      const idx = pendingScrollRef.current;
      pendingScrollRef.current = null;
      requestAnimationFrame(() => {
        const el = document.getElementById(`slide-day-${idx}`);
        if (el) {
          el.scrollIntoView({ behavior: "smooth", block: "start" });
        }
      });
    }
  }, [state.days.length]);

  const handleAddDay = useCallback(() => {
    const lastDay = state.days[state.days.length - 1];
    const nextNum = lastDay ? lastDay.dayNumber + 1 : 1;
    const nextDate = lastDay
      ? (() => {
          const d = new Date(lastDay.date + "T12:00:00");
          d.setDate(d.getDate() + 1);
          return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
        })()
      : "2026-03-26";
    const weekdays = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
    const nextWeekday = weekdays[new Date(nextDate + "T12:00:00").getDay()];

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

    pendingScrollRef.current = state.days.length;
  }, [addDay, state.days]);

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
      {/* Overview modal */}
      {showOverview && (
        <Overview
          data={state}
          onClose={() => setShowOverview(false)}
          onMoveDay={moveDay}
          onRemoveDay={removeDay}
        />
      )}

      {/* Scroll index — right edge */}
      <SlideIndex slides={slideIndexEntries} />

      {/* Top toolbar */}
      <Toolbar
        onShare={handleShare}
        onOverview={() => setShowOverview(true)}
        onAddDay={handleAddDay}
        onAddCity={handleAddCityDestination}
        onReset={reset}
        onBack={() => setView("landing")}
        locked={locked}
        onToggleLock={() => setLocked((l) => !l)}
      />

      {/* All slides — locked class disables editing */}
      <div className={locked ? "locked-itinerary" : ""}>

      {/* Cover Slide */}
      <div id="slide-cover" data-slide>
        <CoverSlide
          data={state}
          onEditTitle={locked ? undefined : updateTitle}
          onAddCity={locked ? undefined : addCity}
          onRemoveCity={locked ? undefined : removeCity}
        />
      </div>

      {/* Flat slide list — city intros auto-inserted when city changes */}
      {flatSlides.map((slide, i) => {
        if (slide.type === "city-intro") {
          const city = state.cities[slide.cityId];
          if (!city) return null;
          return (
            <div key={`city-${slide.cityId}-${i}`} id={`slide-city-${slide.cityId}-${i}`} data-slide>
              <CityIntroSlide
                city={city}
                cityId={slide.cityId}
                maxCityNameLength={maxCityNameLength}
                isGenerating={generatingCityId === slide.cityId}
                onRemove={() => {
                  const dayIndicesToRemove = state.days
                    .map((d, idx) => d.cityId === slide.cityId ? idx : -1)
                    .filter(idx => idx >= 0)
                    .reverse();
                  dayIndicesToRemove.forEach(idx => removeDay(idx));
                  removeCity(slide.cityId);
                }}
              />
            </div>
          );
        }

        const day = state.days[slide.dayIndex];
        const city = state.cities[day.cityId];
        if (!city) return null;
        return (
          <div key={`day-${day.dayNumber}-${slide.dayIndex}`} id={`slide-day-${slide.dayIndex}`} data-slide>
            <DaySlide
              day={day}
              city={city}
              dayIndex={slide.dayIndex}
              totalDays={state.days.length}
              onUpdateEvent={updateEvent}
              onAddEvent={addEvent}
              onRemoveEvent={removeEvent}
              onReorderEvents={reorderEvents}
              onUpdateGallerySlot={updateGallerySlot}
              onAddGallerySlot={addGallerySlot}
              onRemoveGallerySlot={removeGallerySlot}
              onUpdateDayField={updateDayField}
              onUpdateDayDate={updateDayDate}
              onUpdateDayWeatherLoc={updateDayWeatherLoc}
              onRemoveDay={removeDay}
              locked={locked}
            />
          </div>
        );
      })}

      {/* ADD — compact button below last day */}
      {!locked && (
        <div className="flex items-center justify-center gap-4 py-16">
          <button
            onClick={handleAddDay}
            className="bg-white text-black text-sm font-bold uppercase tracking-widest px-10 py-3.5 border-2 border-black hover:bg-neutral-100"
          >
            + Add Day
          </button>
        </div>
      )}

      </div>{/* end locked-itinerary wrapper */}

      {/* Toast notification */}
      <Toast
        message={toastMsg}
        visible={toastVisible}
        onDismiss={() => setToastVisible(false)}
        duration={6000}
      />
    </main>
  );
}
