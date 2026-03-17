// src/lib/tripStore.ts
// localStorage-based multi-trip persistence

import type { ItineraryData } from "@/types/itinerary";

const STORE_KEY = "trip-planner-trips";

export interface TripMeta {
  id: string;
  title: string;       // e.g. "Europe Alps Tour"
  startCity: string;    // e.g. "Geneva"
  endCity: string;      // e.g. "Vienna"
  totalDays: number;
  startDate: string;    // "2026-03-26"
  endDate: string;      // "2026-04-09"
  updatedAt: number;    // timestamp
}

interface StoredTrip {
  meta: TripMeta;
  data: ItineraryData;
}

function readStore(): Record<string, StoredTrip> {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem(STORE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function writeStore(store: Record<string, StoredTrip>) {
  localStorage.setItem(STORE_KEY, JSON.stringify(store));
}

/** List all saved trips, sorted by most recently updated */
export function listTrips(): TripMeta[] {
  const store = readStore();
  return Object.values(store)
    .map((t) => t.meta)
    .sort((a, b) => b.updatedAt - a.updatedAt);
}

/** Get a trip's full data */
export function loadTrip(id: string): ItineraryData | null {
  const store = readStore();
  return store[id]?.data ?? null;
}

/** Save/update a trip */
export function saveTrip(id: string, data: ItineraryData) {
  const store = readStore();
  const days = data.days;
  const firstDay = days[0];
  const lastDay = days[days.length - 1];

  // Derive city names from the data
  const firstCityId = firstDay?.cityId;
  const lastCityId = lastDay?.cityId;
  const startCity = firstCityId ? (data.cities[firstCityId]?.name ?? firstCityId) : "";
  const endCity = lastCityId ? (data.cities[lastCityId]?.name ?? lastCityId) : "";

  const meta: TripMeta = {
    id,
    title: data.tripTitle.filter(Boolean).join(" "),
    startCity,
    endCity,
    totalDays: days.length,
    startDate: firstDay?.date ?? "",
    endDate: lastDay?.date ?? "",
    updatedAt: Date.now(),
  };

  store[id] = { meta, data };
  writeStore(store);
}

/** Delete a trip */
export function deleteTrip(id: string) {
  const store = readStore();
  delete store[id];
  writeStore(store);
}

/** Generate a slug ID from a title */
export function generateTripId(title: string): string {
  const slug = title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
  return slug || `trip-${Date.now()}`;
}

/** Create a blank ItineraryData from form inputs */
export function createBlankItinerary(opts: {
  title: string;
  startDate: string;
  endDate: string;
  startCity: string;
  endCity: string;
}): ItineraryData {
  const titleWords = opts.title.toUpperCase().split(/\s+/);

  // Calculate number of days
  const start = new Date(opts.startDate + "T00:00:00");
  const end = opts.endDate ? new Date(opts.endDate + "T00:00:00") : start;
  const diffDays = Math.max(1, Math.round((end.getTime() - start.getTime()) / 86400000) + 1);

  const weekdays = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

  // Create days
  const days = Array.from({ length: diffDays }, (_, i) => {
    const d = new Date(start);
    d.setDate(d.getDate() + i);
    const dateStr = d.toISOString().split("T")[0];
    return {
      dayNumber: i + 1,
      date: dateStr,
      weekday: weekdays[d.getDay()],
      cityId: "city-1",
      route: i === 0 && opts.startCity ? `${opts.startCity.toUpperCase()} \u2708 ${opts.endCity.toUpperCase() || "TBD"}` : "",
      accommodation: "",
      events: [],
      gallery: [
        { url: null, caption: null, size: "large" as const, slot: "A" },
        { url: null, caption: null, size: "medium" as const, slot: "B" },
      ],
    };
  });

  // Create a placeholder city
  const cities: Record<string, import("@/types/itinerary").CityData> = {
    "city-1": {
      name: opts.endCity || "Destination",
      splitName: [
        (opts.endCity || "DEST").substring(0, 3).toUpperCase(),
        (opts.endCity || "INATION").substring(3).toUpperCase() || ".",
      ],
      country: "",
      countryLabel: "",
      lat: 47.0,
      lng: 8.0,
      description: "",
      mapZoom: 12,
    },
  };

  return {
    tripTitle: titleWords,
    travellers: 1,
    origin: opts.startCity || "",
    cities,
    days,
  };
}
