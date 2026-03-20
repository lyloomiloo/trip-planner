"use client";

import { useMemo, useState, useCallback, useEffect, useRef } from "react";
import { useItinerary } from "@/hooks/useItinerary";
import { loadTrip, saveTrip, generateTripId, createBlankItinerary, saveTripPassphrase, getTripPassphrase, deriveMeta } from "@/lib/tripStore";
import { isSupabaseEnabled, createTripRemote } from "@/lib/supabaseSync";
import { generateCityDetails, queuePendingCity, removePendingCity, getPendingCities } from "@/lib/gemini";
import LandingPage from "@/components/LandingPage";
import NewTripForm from "@/components/NewTripForm";
import type { NewTripData } from "@/components/NewTripForm";
import AITripWizard from "@/components/AITripWizard";
import CoverSlide from "@/components/CoverSlide";
import CityIntroSlide from "@/components/CityIntroSlide";
import DaySlide from "@/components/DaySlide";
import Toolbar from "@/components/Toolbar";
import SlideIndex from "@/components/SlideIndex";
import Overview from "@/components/Overview";
import Toast from "@/components/Toast";
import PassphraseModal from "@/components/PassphraseModal";
import type { ItineraryData } from "@/types/itinerary";

// Default trip ID for the bundled europe-alps itinerary
const DEFAULT_TRIP_ID = "europe-alps-tour";

export default function Home() {
  const [view, setView] = useState<"landing" | "new" | "manual" | "ai-generate" | "trip">("landing");
  const [showOverview, setShowOverview] = useState(false);
  const [activeTripId, setActiveTripId] = useState<string>(DEFAULT_TRIP_ID);
  const [initialData, setInitialData] = useState<ItineraryData | undefined>(undefined);
  const [locked, setLocked] = useState(false);
  const [addingCityInline, setAddingCityInline] = useState(false);
  const [newCityInput, setNewCityInput] = useState("");

  const {
    state,
    syncStatus,
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
    moveCityBlock,
    loadData,
    importJSON,
    reset,
    addComment,
    updateComment,
    removeComment,
    exportJSON,
    undo,
    redo,
    canUndo,
    canRedo,
  } = useItinerary(activeTripId, initialData);

  // Passphrase modal state
  const [showPassphraseModal, setShowPassphraseModal] = useState(false);
  const [hasPassphrase, setHasPassphrase] = useState(false);
  const [supabaseEnabled, setSupabaseEnabled] = useState(false);

  useEffect(() => {
    setSupabaseEnabled(isSupabaseEnabled());
  }, []);

  useEffect(() => {
    setHasPassphrase(!!getTripPassphrase(activeTripId));
  }, [activeTripId, showPassphraseModal]);

  // handlePublish defined after showToast below

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

  // Build a flat slide list directly from the days array (which now includes city-intro entries)
  const flatSlides = useMemo(() => {
    return state.days.map((day, i) =>
      day.isCityIntro
        ? { type: "city-intro" as const, cityId: day.cityId, dayIndex: i }
        : { type: "day" as const, dayIndex: i }
    );
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
          id: `slide-city-${slide.dayIndex}`,
          label: city?.name ?? slide.cityId,
          type: "city",
        });
      } else {
        const day = state.days[slide.dayIndex];
        entries.push({
          id: `slide-day-${slide.dayIndex}`,
          label: `Day ${day.dayNumber}`,
          sublabel: day.route || state.cities[day.cityId]?.name || day.cityId,
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

  /** Open the default bundled trip — prefer saved version from localStorage */
  const handleOpenDefault = () => {
    setActiveTripId(DEFAULT_TRIP_ID);
    const saved = loadTrip(DEFAULT_TRIP_ID);
    if (saved) {
      setInitialData(saved);
      loadData(saved);
    } else {
      setInitialData(undefined); // uses bundled JSON
      // Save it to the store so it shows up in Continue Plan
      saveTrip(DEFAULT_TRIP_ID, state);
    }
    setView("trip");
  };

  /** Create a trip from form data with multiple destinations — geocode + Gemini all cities */
  const handleCreateBlank = async (formData: NewTripData) => {
    const tripId = generateTripId(formData.title);
    const data = createBlankItinerary(formData);
    saveTrip(tripId, data);
    setActiveTripId(tripId);
    setInitialData(data);
    loadData(data);
    setView("trip");

    // Prompt for passphrase if Supabase is enabled
    if (isSupabaseEnabled()) {
      setTimeout(() => setShowPassphraseModal(true), 500);
    }

    // Geocode + Gemini each destination city in background
    for (const dest of formData.destinations) {
      const cityId = dest.city.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-");

      // Geocode
      try {
        const res = await fetch(
          `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(dest.city)}&format=json&limit=1`
        );
        const results = await res.json();
        if (results?.[0]) {
          updateCity(cityId, {
            lat: parseFloat(results[0].lat),
            lng: parseFloat(results[0].lon),
          });
        }
      } catch { /* silent */ }

      // Gemini city details
      setGeneratingCityId(cityId);
      const result = await generateCityDetails(dest.city);
      if (result.status === "ok") {
        updateCity(cityId, result.data);
        removePendingCity(cityId);
      } else if (result.status === "rate-limited") {
        // Queue remaining cities too
        queuePendingCity(cityId, dest.city);
        const remaining = formData.destinations.slice(formData.destinations.indexOf(dest) + 1);
        for (const r of remaining) {
          const rId = r.city.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-");
          queuePendingCity(rId, r.city);
        }
        showToast("Rate limited — remaining cities will auto-generate in ~60 seconds");
        setGeneratingCityId(null);
        break; // Stop the loop, let the retry interval handle the rest
      }
      setGeneratingCityId(null);
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

  /** Publish trip to cloud — set passphrase and upload to Supabase */
  const handlePublish = useCallback(async (passphrase: string) => {
    saveTripPassphrase(activeTripId, passphrase);
    const meta = deriveMeta(activeTripId, state);
    const ok = await createTripRemote(activeTripId, passphrase, meta, state);
    if (ok) {
      showToast("Trip published to cloud — share the link with others");
    } else {
      showToast("Failed to publish — it may already exist in the cloud");
    }
    setShowPassphraseModal(false);
  }, [activeTripId, state, showToast]);

  // State for generating cities
  const [generatingCityId, setGeneratingCityId] = useState<string | null>(null);

  // Ref to track pending scroll-to after adding a day
  const pendingScrollRef = useRef<number | null>(null);

  /** Add a new city destination with Gemini-generated details (called from toolbar) */
  const handleAddCityDestination = useCallback(async (cityName: string) => {
    const id = cityName.toLowerCase().replace(/[^a-z0-9]+/g, "-");
    const name = cityName.trim();

    // Immediately add placeholder city (no day card)
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

    // Add city-intro entry only
    const lastDay = state.days[state.days.length - 1];
    const nextDate = lastDay
      ? (() => {
          const d = new Date(lastDay.date + "T12:00:00");
          d.setDate(d.getDate() + 1);
          return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
        })()
      : "2026-03-26";
    const weekdays = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
    const nextWeekday = weekdays[new Date(nextDate + "T12:00:00").getDay()];

    // Add city-intro entry first
    addDay({
      dayNumber: 0,
      date: nextDate,
      weekday: nextWeekday,
      cityId: id,
      route: "",
      accommodation: "",
      events: [],
      gallery: [],
      isCityIntro: true,
    });

    // Auto-scroll to the new city intro after render
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
      showToast("Rate limited — city summary will generate when the limit resets");
    } else {
      showToast("Could not generate city details — check your Gemini API key");
    }
    setGeneratingCityId(null);
  }, [addCity, addDay, updateCity, showToast, state.days]);

  // Retry any queued cities — on mount + every 60 seconds
  useEffect(() => {
    if (view !== "trip") return;

    const retryPending = async () => {
      const pending = getPendingCities();
      if (pending.length === 0) return;

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
        }
        // On rate-limited or error, leave in queue — next cycle will retry
        setGeneratingCityId(null);
      }
    };

    // Retry immediately on mount
    retryPending();

    // Then retry every 45 seconds
    const interval = setInterval(retryPending, 45_000);
    return () => clearInterval(interval);
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
      cityId: "",
      route: "",
      accommodation: "",
      events: [],
      gallery: [
        { url: null, caption: null, size: "large", slot: "A" },
        { url: null, caption: null, size: "medium", slot: "B" },
        { url: null, caption: null, size: "medium", slot: "C" },
        { url: null, caption: null, size: "small", slot: "D" },
        { url: null, caption: null, size: "large", slot: "E" },
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

  // New trip — chooser screen
  if (view === "new") {
    return (
      <div className="relative h-screen w-full overflow-hidden bg-white">
        <button
          onClick={() => setView("landing")}
          className="absolute top-8 left-8 z-10 text-xs font-bold uppercase tracking-widest text-black/40 hover:text-black"
        >
          &larr; Back
        </button>
        <div className="h-full flex flex-col items-center justify-center gap-8">
          <h1 className="text-[6vw] font-black uppercase tracking-tighter leading-none text-black mb-4">
            NEW TRIP
          </h1>
          <div className="flex gap-5">
            <button
              onClick={() => setView("ai-generate")}
              className="bg-black text-white text-sm font-bold uppercase tracking-widest px-10 py-3.5 hover:bg-neutral-800 w-72 border-2 border-black"
            >
              ✨ Generate with AI
            </button>
            <button
              onClick={() => setView("manual")}
              className="bg-white text-black text-sm font-bold uppercase tracking-widest px-10 py-3.5 hover:bg-neutral-100 w-72 border-2 border-black"
            >
              ✏️ Manual Input
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Manual trip form
  if (view === "manual") {
    return (
      <NewTripForm
        onBack={() => setView("new")}
        onCreateBlank={handleCreateBlank}
        onImport={handleImportAsNewTrip}
      />
    );
  }

  // AI itinerary generator wizard
  if (view === "ai-generate") {
    return (
      <AITripWizard
        onBack={() => setView("new")}
        onComplete={async (data, title, startDate) => {
          const tripId = generateTripId(title);
          saveTrip(tripId, data);
          setActiveTripId(tripId);
          setInitialData(data);
          loadData(data);
          setView("trip");

          if (isSupabaseEnabled()) {
            setTimeout(() => setShowPassphraseModal(true), 500);
          }

          // Gemini city detail generation for each city
          for (const [cityId, city] of Object.entries(data.cities)) {
            setGeneratingCityId(cityId);

            // Geocode
            try {
              const res = await fetch(
                `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(city.name)}&format=json&limit=1`
              );
              const results = await res.json();
              if (results?.[0]) {
                updateCity(cityId, {
                  lat: parseFloat(results[0].lat),
                  lng: parseFloat(results[0].lon),
                });
              }
            } catch { /* silent */ }

            // Gemini enrichment
            const result = await generateCityDetails(city.name);
            if (result.status === "ok") {
              updateCity(cityId, result.data);
              removePendingCity(cityId);
            } else if (result.status === "rate-limited") {
              queuePendingCity(cityId, city.name);
              // Queue remaining cities
              const cityEntries = Object.entries(data.cities);
              const currentIdx = cityEntries.findIndex(([id]) => id === cityId);
              for (let i = currentIdx + 1; i < cityEntries.length; i++) {
                queuePendingCity(cityEntries[i][0], cityEntries[i][1].name);
              }
              showToast("Rate limited — remaining cities will auto-generate in ~60 seconds");
              setGeneratingCityId(null);
              break;
            }
            setGeneratingCityId(null);
          }
        }}
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
          onRemoveCity={removeCity}
          onAddDay={locked ? undefined : handleAddDay}
          onAddCity={locked ? undefined : handleAddCityDestination}
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
        onBack={() => setView("landing")}
        locked={locked}
        onToggleLock={() => setLocked((l) => !l)}
        syncStatus={syncStatus}
        onPublish={supabaseEnabled && !hasPassphrase ? () => setShowPassphraseModal(true) : undefined}
        onExportJson={exportJSON}
        onUndo={undo}
        onRedo={redo}
        canUndo={canUndo}
        canRedo={canRedo}
      />

      {/* Passphrase modal */}
      {showPassphraseModal && (
        <PassphraseModal
          tripId={activeTripId}
          mode="create"
          onSuccess={handlePublish}
          onCancel={() => setShowPassphraseModal(false)}
        />
      )}

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
            <div key={`city-${slide.dayIndex}`} id={`slide-city-${slide.dayIndex}`} data-slide>
              <CityIntroSlide
                city={city}
                cityId={slide.cityId}
                maxCityNameLength={maxCityNameLength}
                isGenerating={generatingCityId === slide.cityId}
                onRemove={() => {
                  // Remove this specific city-intro slide by index — day cards untouched
                  removeDay(slide.dayIndex);
                }}
                onRetryGenerate={async () => {
                  setGeneratingCityId(slide.cityId);
                  const result = await generateCityDetails(city.name);
                  if (result.status === "ok") {
                    updateCity(slide.cityId, result.data);
                    removePendingCity(slide.cityId);
                  }
                  setGeneratingCityId(null);
                }}
                onUpdateCity={(updates) => updateCity(slide.cityId, updates)}
                locked={locked}
                comments={state.comments || []}
                onAddComment={addComment}
                onUpdateComment={updateComment}
                onRemoveComment={removeComment}
              />
            </div>
          );
        }

        const day = state.days[slide.dayIndex];
        const city = state.cities[day.cityId] ?? {
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
              totalDays={state.days.filter(d => !d.isCityIntro).length}
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
              comments={state.comments || []}
              onAddComment={addComment}
              onUpdateComment={updateComment}
              onRemoveComment={removeComment}
            />
          </div>
        );
      })}

      {/* ADD — compact buttons below last day */}
      {!locked && (
        <div className="flex flex-col items-center gap-4 py-16">
          <div className="flex items-center gap-4">
            <button
              onClick={handleAddDay}
              className="bg-white text-black text-sm font-bold uppercase tracking-widest px-10 py-3.5 border-2 border-black hover:bg-neutral-100"
            >
              + Add Day
            </button>
            {!addingCityInline ? (
              <button
                onClick={() => setAddingCityInline(true)}
                className="bg-black text-white text-sm font-bold uppercase tracking-widest px-10 py-3.5 border-2 border-black hover:bg-neutral-800"
              >
                + Add City
              </button>
            ) : (
              <div className="flex items-center gap-2 border-2 border-black px-4 py-2">
                <input
                  autoFocus
                  value={newCityInput}
                  onChange={(e) => setNewCityInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && newCityInput.trim()) {
                      handleAddCityDestination(newCityInput.trim());
                      setNewCityInput("");
                      setAddingCityInline(false);
                    }
                    if (e.key === "Escape") {
                      setNewCityInput("");
                      setAddingCityInline(false);
                    }
                  }}
                  placeholder="City name"
                  className="bg-transparent text-sm font-bold uppercase tracking-widest focus:outline-none w-40 placeholder:text-neutral-300"
                />
                <button
                  onClick={() => {
                    if (newCityInput.trim()) {
                      handleAddCityDestination(newCityInput.trim());
                      setNewCityInput("");
                      setAddingCityInline(false);
                    }
                  }}
                  className="text-xs font-bold uppercase tracking-widest bg-black text-white px-3 py-1.5 hover:bg-neutral-800"
                >
                  Add
                </button>
                <button
                  onClick={() => { setNewCityInput(""); setAddingCityInline(false); }}
                  className="text-neutral-400 hover:text-black text-sm"
                >
                  &times;
                </button>
              </div>
            )}
          </div>
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
