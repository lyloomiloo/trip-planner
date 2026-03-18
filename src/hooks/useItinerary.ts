"use client";

import { useReducer, useCallback, useEffect, useRef, useState } from "react";
import type {
  ItineraryData,
  DayData,
  CityData,
  ScheduleEvent,
  GallerySlot,
} from "@/types/itinerary";
import { saveTrip, loadTrip, getTripPassphrase, deriveMeta } from "@/lib/tripStore";
import { isSupabaseEnabled, syncTripToRemote } from "@/lib/supabaseSync";
import rawData from "@/../data/itinerary.json";

// ─── Action types ────────────────────────────────────────

type Action =
  | { type: "UPDATE_EVENT"; dayIndex: number; eventIndex: number; event: Partial<ScheduleEvent> }
  | { type: "ADD_EVENT"; dayIndex: number; event: ScheduleEvent }
  | { type: "REMOVE_EVENT"; dayIndex: number; eventIndex: number }
  | { type: "REORDER_EVENTS"; dayIndex: number; fromIndex: number; toIndex: number }
  | { type: "UPDATE_GALLERY_SLOT"; dayIndex: number; slotIndex: number; slot: Partial<GallerySlot> }
  | { type: "ADD_GALLERY_SLOT"; dayIndex: number; slot: GallerySlot }
  | { type: "REMOVE_GALLERY_SLOT"; dayIndex: number; slotIndex: number }
  | { type: "UPDATE_DAY_FIELD"; dayIndex: number; field: keyof DayData; value: string }
  | { type: "UPDATE_DAY_DATE"; dayIndex: number; date: string }
  | { type: "UPDATE_DAY_WEATHER_LOC"; dayIndex: number; lat: number; lng: number; cityName?: string }
  | { type: "ADD_DAY"; day: DayData }
  | { type: "REMOVE_DAY"; dayIndex: number }
  | { type: "MOVE_DAY"; fromIndex: number; toIndex: number }
  | { type: "MOVE_CITY_BLOCK"; fromCityId: string; direction: "up" | "down" }
  | { type: "UPDATE_TITLE"; title: string[] }
  | { type: "ADD_CITY"; cityId: string; city: CityData }
  | { type: "UPDATE_CITY"; cityId: string; updates: Partial<CityData> }
  | { type: "REMOVE_CITY"; cityId: string }
  | { type: "LOAD_DATA"; data: ItineraryData }
  | { type: "RESET" };

// ─── Helpers ─────────────────────────────────────────────

const WEEKDAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

/** Format a local Date as YYYY-MM-DD without UTC shift */
function toLocalDateStr(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/** Renumber days sequentially and recalculate dates from the first real day's date.
 *  City-intro entries keep their position but don't count toward day numbers. */
function renumberDays(days: DayData[]): DayData[] {
  if (days.length === 0) return days;
  // Find the first real (non-city-intro) day for the base date
  const firstReal = days.find((d) => !d.isCityIntro);
  if (!firstReal) return days;
  const baseDate = new Date(firstReal.date + "T12:00:00");
  let dayCount = 0;
  return days.map((d) => {
    if (d.isCityIntro) return d; // skip city intros
    const dt = new Date(baseDate);
    dt.setDate(dt.getDate() + dayCount);
    dayCount++;
    return {
      ...d,
      dayNumber: dayCount,
      date: toLocalDateStr(dt),
      weekday: WEEKDAYS[dt.getDay()],
    };
  });
}

/** Ensure city-intro entries exist in the days array.
 *  Inserts a city-intro before the first day of each city if one doesn't already exist. */
function ensureCityIntros(days: DayData[], cities: Record<string, import("@/types/itinerary").CityData>): DayData[] {
  const result: DayData[] = [];
  let lastCityId: string | null = null;

  for (const day of days) {
    if (day.isCityIntro) {
      result.push(day);
      lastCityId = day.cityId;
      continue;
    }
    // Check if we need to insert a city-intro before this day
    if (day.cityId !== lastCityId) {
      // Only insert if there isn't already a city-intro for this city right before
      const prevEntry = result[result.length - 1];
      if (!prevEntry || !prevEntry.isCityIntro || prevEntry.cityId !== day.cityId) {
        result.push({
          dayNumber: 0,
          date: day.date,
          weekday: day.weekday,
          cityId: day.cityId,
          route: "",
          accommodation: "",
          events: [],
          gallery: [],
          isCityIntro: true,
        });
      }
    }
    result.push(day);
    lastCityId = day.cityId;
  }

  return result;
}

// ─── Reducer ─────────────────────────────────────────────

function itineraryReducer(state: ItineraryData, action: Action): ItineraryData {
  switch (action.type) {
    case "UPDATE_EVENT": {
      const days = [...state.days];
      const day = { ...days[action.dayIndex] };
      const events = [...day.events];
      events[action.eventIndex] = { ...events[action.eventIndex], ...action.event };
      day.events = events;
      days[action.dayIndex] = day;
      return { ...state, days };
    }

    case "ADD_EVENT": {
      const days = [...state.days];
      const day = { ...days[action.dayIndex] };
      day.events = [...day.events, action.event];
      days[action.dayIndex] = day;
      return { ...state, days };
    }

    case "REMOVE_EVENT": {
      const days = [...state.days];
      const day = { ...days[action.dayIndex] };
      day.events = day.events.filter((_, i) => i !== action.eventIndex);
      days[action.dayIndex] = day;
      return { ...state, days };
    }

    case "REORDER_EVENTS": {
      const days = [...state.days];
      const day = { ...days[action.dayIndex] };
      const events = [...day.events];
      const [moved] = events.splice(action.fromIndex, 1);
      events.splice(action.toIndex, 0, moved);
      day.events = events;
      days[action.dayIndex] = day;
      return { ...state, days };
    }

    case "UPDATE_GALLERY_SLOT": {
      const days = [...state.days];
      const day = { ...days[action.dayIndex] };
      const gallery = [...day.gallery];
      gallery[action.slotIndex] = { ...gallery[action.slotIndex], ...action.slot };
      day.gallery = gallery;
      days[action.dayIndex] = day;
      return { ...state, days };
    }

    case "ADD_GALLERY_SLOT": {
      const days = [...state.days];
      const day = { ...days[action.dayIndex] };
      day.gallery = [...day.gallery, action.slot];
      days[action.dayIndex] = day;
      return { ...state, days };
    }

    case "REMOVE_GALLERY_SLOT": {
      const days = [...state.days];
      const day = { ...days[action.dayIndex] };
      day.gallery = day.gallery.filter((_, i) => i !== action.slotIndex);
      days[action.dayIndex] = day;
      return { ...state, days };
    }

    case "UPDATE_DAY_FIELD": {
      const days = [...state.days];
      const day = { ...days[action.dayIndex], [action.field]: action.value };
      days[action.dayIndex] = day;
      return { ...state, days };
    }

    case "UPDATE_DAY_DATE": {
      // Set the date for this day, then cascade all subsequent real days
      const days = [...state.days];
      const baseDate = new Date(action.date + "T12:00:00");
      let offset = 0;
      for (let i = action.dayIndex; i < days.length; i++) {
        if (days[i].isCityIntro) continue;
        const dt = new Date(baseDate);
        dt.setDate(dt.getDate() + offset);
        days[i] = { ...days[i], date: toLocalDateStr(dt), weekday: WEEKDAYS[dt.getDay()] };
        offset++;
      }
      return { ...state, days };
    }

    case "UPDATE_DAY_WEATHER_LOC": {
      const days = [...state.days];
      days[action.dayIndex] = {
        ...days[action.dayIndex],
        weatherLat: action.lat,
        weatherLng: action.lng,
        ...(action.cityName ? { weatherCityName: action.cityName } : {}),
      };
      return { ...state, days };
    }

    case "ADD_DAY": {
      return { ...state, days: [...state.days, action.day] };
    }

    case "REMOVE_DAY": {
      const filtered = state.days.filter((_, i) => i !== action.dayIndex);
      return { ...state, days: renumberDays(filtered) };
    }

    case "MOVE_DAY": {
      const days = [...state.days];
      const [moved] = days.splice(action.fromIndex, 1);
      days.splice(action.toIndex, 0, moved);
      return { ...state, days: renumberDays(days) };
    }

    case "MOVE_CITY_BLOCK": {
      // Group days into city blocks (consecutive days with same cityId)
      const blocks: { cityId: string; days: typeof state.days }[] = [];
      for (const day of state.days) {
        const last = blocks[blocks.length - 1];
        if (last && last.cityId === day.cityId) {
          last.days.push(day);
        } else {
          blocks.push({ cityId: day.cityId, days: [day] });
        }
      }
      const blockIdx = blocks.findIndex((b) => b.cityId === action.fromCityId);
      if (blockIdx < 0) return state;
      const targetIdx = action.direction === "up" ? blockIdx - 1 : blockIdx + 1;
      if (targetIdx < 0 || targetIdx >= blocks.length) return state;
      // Swap blocks
      const temp = blocks[blockIdx];
      blocks[blockIdx] = blocks[targetIdx];
      blocks[targetIdx] = temp;
      // Flatten back
      const newDays = blocks.flatMap((b) => b.days);
      return { ...state, days: renumberDays(newDays) };
    }

    case "UPDATE_TITLE": {
      return { ...state, tripTitle: action.title };
    }

    case "ADD_CITY": {
      return { ...state, cities: { ...state.cities, [action.cityId]: action.city } };
    }

    case "UPDATE_CITY": {
      const existing = state.cities[action.cityId];
      if (!existing) return state;
      return {
        ...state,
        cities: {
          ...state.cities,
          [action.cityId]: { ...existing, ...action.updates },
        },
      };
    }

    case "REMOVE_CITY": {
      const { [action.cityId]: _, ...rest } = state.cities;
      return { ...state, cities: rest };
    }

    case "LOAD_DATA": {
      return {
        ...action.data,
        days: ensureCityIntros(action.data.days, action.data.cities),
      };
    }

    case "RESET": {
      return defaultData;
    }

    default:
      return state;
  }
}

// ─── Default data (from bundled JSON) ────────────────────

const defaultData = rawData as unknown as ItineraryData;

// ─── Hook ────────────────────────────────────────────────

export type SyncStatus = "idle" | "syncing" | "synced" | "error" | "offline";

export function useItinerary(tripId?: string, initialData?: ItineraryData) {
  // Priority: explicit initialData > localStorage > bundled JSON
  const raw = initialData ?? (tripId ? loadTrip(tripId) : null) ?? defaultData;
  const startData = { ...raw, days: ensureCityIntros(raw.days, raw.cities) };
  const [state, dispatch] = useReducer(itineraryReducer, startData);
  const [syncStatus, setSyncStatus] = useState<SyncStatus>("idle");

  // Auto-save to localStorage + debounced Supabase sync
  const isFirstRender = useRef(true);
  const syncTimeoutRef = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    if (tripId) {
      // Instant localStorage save
      saveTrip(tripId, state);

      // Debounced Supabase sync (2s delay)
      if (isSupabaseEnabled()) {
        const passphrase = getTripPassphrase(tripId);
        if (passphrase) {
          clearTimeout(syncTimeoutRef.current);
          setSyncStatus("syncing");
          syncTimeoutRef.current = setTimeout(async () => {
            const meta = deriveMeta(tripId, state);
            const ok = await syncTripToRemote(tripId, passphrase, meta, state);
            setSyncStatus(ok ? "synced" : "error");
          }, 2000);
        } else {
          setSyncStatus("offline");
        }
      }
    }

    return () => clearTimeout(syncTimeoutRef.current);
  }, [state, tripId]);

  const updateEvent = useCallback(
    (dayIndex: number, eventIndex: number, event: Partial<ScheduleEvent>) =>
      dispatch({ type: "UPDATE_EVENT", dayIndex, eventIndex, event }),
    []
  );

  const addEvent = useCallback(
    (dayIndex: number, event: ScheduleEvent) =>
      dispatch({ type: "ADD_EVENT", dayIndex, event }),
    []
  );

  const removeEvent = useCallback(
    (dayIndex: number, eventIndex: number) =>
      dispatch({ type: "REMOVE_EVENT", dayIndex, eventIndex }),
    []
  );

  const reorderEvents = useCallback(
    (dayIndex: number, fromIndex: number, toIndex: number) =>
      dispatch({ type: "REORDER_EVENTS", dayIndex, fromIndex, toIndex }),
    []
  );

  const updateGallerySlot = useCallback(
    (dayIndex: number, slotIndex: number, slot: Partial<GallerySlot>) =>
      dispatch({ type: "UPDATE_GALLERY_SLOT", dayIndex, slotIndex, slot }),
    []
  );

  const addGallerySlot = useCallback(
    (dayIndex: number, slot: GallerySlot) =>
      dispatch({ type: "ADD_GALLERY_SLOT", dayIndex, slot }),
    []
  );

  const removeGallerySlot = useCallback(
    (dayIndex: number, slotIndex: number) =>
      dispatch({ type: "REMOVE_GALLERY_SLOT", dayIndex, slotIndex }),
    []
  );

  const updateDayField = useCallback(
    (dayIndex: number, field: keyof DayData, value: string) =>
      dispatch({ type: "UPDATE_DAY_FIELD", dayIndex, field, value }),
    []
  );

  const updateDayDate = useCallback(
    (dayIndex: number, date: string) =>
      dispatch({ type: "UPDATE_DAY_DATE", dayIndex, date }),
    []
  );

  const updateDayWeatherLoc = useCallback(
    (dayIndex: number, lat: number, lng: number, cityName?: string) =>
      dispatch({ type: "UPDATE_DAY_WEATHER_LOC", dayIndex, lat, lng, cityName }),
    []
  );

  const addDay = useCallback((day: DayData) => dispatch({ type: "ADD_DAY", day }), []);

  const removeDay = useCallback(
    (dayIndex: number) => dispatch({ type: "REMOVE_DAY", dayIndex }),
    []
  );

  const moveDay = useCallback(
    (fromIndex: number, toIndex: number) =>
      dispatch({ type: "MOVE_DAY", fromIndex, toIndex }),
    []
  );

  const moveCityBlock = useCallback(
    (cityId: string, direction: "up" | "down") =>
      dispatch({ type: "MOVE_CITY_BLOCK", fromCityId: cityId, direction }),
    []
  );

  const updateTitle = useCallback(
    (title: string[]) => dispatch({ type: "UPDATE_TITLE", title }),
    []
  );

  const addCity = useCallback(
    (cityId: string, city: CityData) => dispatch({ type: "ADD_CITY", cityId, city }),
    []
  );

  const updateCity = useCallback(
    (cityId: string, updates: Partial<CityData>) =>
      dispatch({ type: "UPDATE_CITY", cityId, updates }),
    []
  );

  const removeCity = useCallback(
    (cityId: string) => dispatch({ type: "REMOVE_CITY", cityId }),
    []
  );

  const loadData = useCallback(
    (data: ItineraryData) => dispatch({ type: "LOAD_DATA", data }),
    []
  );

  const reset = useCallback(() => dispatch({ type: "RESET" }), []);

  const exportJSON = useCallback(() => {
    const blob = new Blob([JSON.stringify(state, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "itinerary.json";
    a.click();
    URL.revokeObjectURL(url);
  }, [state]);

  const importJSON = useCallback(
    (file: File) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const data = JSON.parse(e.target?.result as string) as ItineraryData;
          loadData(data);
        } catch {
          alert("Invalid JSON file");
        }
      };
      reader.readAsText(file);
    },
    [loadData]
  );

  return {
    state,
    syncStatus,
    dispatch,
    updateEvent,
    addEvent,
    removeEvent,
    reorderEvents,
    updateGallerySlot,
    addGallerySlot,
    removeGallerySlot,
    updateDayField,
    updateDayDate,
    updateDayWeatherLoc,
    addDay,
    removeDay,
    moveDay,
    moveCityBlock,
    updateTitle,
    addCity,
    updateCity,
    removeCity,
    loadData,
    reset,
    exportJSON,
    importJSON,
  };
}
