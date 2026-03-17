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

interface Destination {
  city: string;
  nights: number;
}

/** Create a fully populated ItineraryData from form inputs with multiple destinations */
export function createBlankItinerary(opts: {
  title: string;
  startDate: string;
  origin: string;
  destinations: Destination[];
}): ItineraryData {
  const titleWords = opts.title.toUpperCase().split(/\s+/);
  const weekdays = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  const start = new Date(opts.startDate + "T12:00:00");

  // Build cities
  const cities: Record<string, import("@/types/itinerary").CityData> = {};
  const cityIds: string[] = [];

  for (const dest of opts.destinations) {
    const name = dest.city.trim();
    const id = name.toLowerCase().replace(/[^a-z0-9]+/g, "-");
    cityIds.push(id);

    const splitAt = Math.ceil(name.length / 2);
    cities[id] = {
      name,
      splitName: [
        name.substring(0, splitAt).toUpperCase(),
        name.substring(splitAt).toUpperCase() || ".",
      ],
      country: "",
      countryLabel: "",
      lat: 47.0,
      lng: 8.0,
      description: "",
      mapZoom: 13,
    };
  }

  // Build days — distributed across destinations by nights
  const days: import("@/types/itinerary").DayData[] = [];
  let dayCounter = 0;

  opts.destinations.forEach((dest, destIdx) => {
    const cityId = cityIds[destIdx];
    const prevCity = destIdx > 0 ? opts.destinations[destIdx - 1].city.toUpperCase() : opts.origin.toUpperCase();
    const currentCity = dest.city.toUpperCase();

    for (let night = 0; night < dest.nights; night++) {
      const d = new Date(start);
      d.setDate(d.getDate() + dayCounter);
      const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

      // Route label: first day of each city shows travel route
      let route = "";
      if (night === 0 && prevCity) {
        route = `${prevCity} \u2192 ${currentCity}`;
      }

      days.push({
        dayNumber: dayCounter + 1,
        date: dateStr,
        weekday: weekdays[d.getDay()],
        cityId,
        route,
        accommodation: "",
        events: [],
        gallery: [
          { url: null, caption: null, size: "large" as const, slot: "A" },
          { url: null, caption: null, size: "medium" as const, slot: "B" },
          { url: null, caption: null, size: "medium" as const, slot: "C" },
          { url: null, caption: null, size: "small" as const, slot: "D" },
          { url: null, caption: null, size: "large" as const, slot: "E" },
        ],
      });

      dayCounter++;
    }
  });

  return {
    tripTitle: titleWords,
    travellers: 1,
    origin: opts.origin || "",
    cities,
    days,
  };
}
