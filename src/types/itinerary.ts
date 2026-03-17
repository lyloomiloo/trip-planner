// src/types/itinerary.ts

export interface GallerySlot {
  url: string | null;         // image URL, base64 data URI, or null (empty)
  caption: string | null;
  size: "small" | "medium" | "large";
  slot: string;               // "A", "B", "C", etc.
  source?: "search" | "url" | "upload";  // how the image was added
  attribution?: string;       // photographer name for Unsplash/Pexels
}

export interface ScheduleEvent {
  time: string;
  title: string;
  type: "transport" | "food" | "activity" | "accommodation" | "rest" | "split";
  highlight?: boolean;
  group?: "A" | "B";  // for split-group events
}

export interface DayData {
  dayNumber: number;
  date: string;       // "2026-03-26"
  weekday: string;
  cityId: string;
  route: string;
  accommodation: string;
  events: ScheduleEvent[];
  gallery: GallerySlot[];
  weatherLat?: number;  // override city lat for weather
  weatherLng?: number;  // override city lng for weather
}

export interface CityData {
  name: string;
  splitName: [string, string];
  country: string;
  countryLabel: string;
  lat: number;
  lng: number;
  description: string;
  mapZoom: number;
  language?: string;
  currency?: string;
  transport?: string;
  mustTry?: string[];
  tips?: string[];
}

export interface ItineraryData {
  tripTitle: string[];  // ["EUROPE", "ALPS", "TOUR", "2026"]
  travellers: number;
  origin: string;
  cities: Record<string, CityData>;
  days: DayData[];
}

// Weather data from Open-Meteo
export interface WeatherData {
  temperature: number;
  temperatureMin: number;
  temperatureMax: number;
  condition: string;
  icon: string;
  sunrise: string;
  sunset: string;
}
