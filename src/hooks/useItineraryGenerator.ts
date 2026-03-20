"use client";

import { useState, useCallback } from "react";
import type {
  TripPreferences,
  CitySuggestion,
  ItinerarySuggestion,
  GeneratedDay,
} from "@/types/generation";
import type { ItineraryData, DayData, CityData } from "@/types/itinerary";

export type GeneratorStep =
  | "idle"
  | "generating-cities"
  | "reviewing"
  | "generating-schedule"
  | "complete";

export function useItineraryGenerator() {
  const [step, setStep] = useState<GeneratorStep>("idle");
  const [preferences, setPreferences] = useState<TripPreferences | null>(null);
  const [suggestions, setSuggestions] = useState<ItinerarySuggestion[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [isAddingCity, setIsAddingCity] = useState(false);

  const currentSuggestion = suggestions[currentIndex] || null;

  /** Collect all city names seen across all suggestions */
  const getAllSeenCities = useCallback((): string[] => {
    const seen = new Set<string>();
    for (const s of suggestions) {
      for (const c of s.cities) seen.add(c.name);
    }
    return Array.from(seen);
  }, [suggestions]);

  const generateCities = useCallback(async (prefs: TripPreferences) => {
    setPreferences(prefs);
    setStep("generating-cities");
    setError(null);

    try {
      const res = await fetch("/api/generate-itinerary", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ step: "cities", preferences: prefs }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || `API error: ${res.status}`);
      }

      const cities: CitySuggestion[] = await res.json();
      const suggestion: ItinerarySuggestion = { cities };
      setSuggestions([suggestion]);
      setCurrentIndex(0);
      setStep("reviewing");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to generate cities");
      setStep("idle");
    }
  }, []);

  const reshuffleCities = useCallback(async () => {
    if (!preferences) return;
    setStep("generating-cities");
    setError(null);

    const exclude = getAllSeenCities();

    try {
      const res = await fetch("/api/generate-itinerary", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ step: "cities", preferences, exclude }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || `API error: ${res.status}`);
      }

      const cities: CitySuggestion[] = await res.json();
      const suggestion: ItinerarySuggestion = { cities };
      setSuggestions((prev) => [...prev, suggestion]);
      setCurrentIndex((prev) => prev + 1);
      setStep("reviewing");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to reshuffle");
      setStep("reviewing");
    }
  }, [preferences, getAllSeenCities]);

  /** Add a single new city via LLM (non-repeated) */
  const addCityViaAI = useCallback(async () => {
    if (!preferences || !currentSuggestion) return;
    setIsAddingCity(true);
    setError(null);

    const exclude = currentSuggestion.cities.map((c) => c.name);

    try {
      const res = await fetch("/api/generate-itinerary", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ step: "add-city", preferences, exclude }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || `API error: ${res.status}`);
      }

      const result = await res.json();
      const newCity: CitySuggestion = result;
      const insertIdx = typeof result.insertAfterIndex === "number"
        ? Math.min(result.insertAfterIndex + 1, currentSuggestion.cities.length)
        : currentSuggestion.cities.length; // fallback: append
      setSuggestions((prev) => {
        const updated = [...prev];
        const cities = [...updated[currentIndex].cities];
        cities.splice(insertIdx, 0, newCity);
        updated[currentIndex] = { ...updated[currentIndex], cities };
        return updated;
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to add city");
    } finally {
      setIsAddingCity(false);
    }
  }, [preferences, currentSuggestion, currentIndex]);

  const goBack = useCallback(() => {
    if (currentIndex > 0) setCurrentIndex((i) => i - 1);
  }, [currentIndex]);

  const goForward = useCallback(() => {
    if (currentIndex < suggestions.length - 1) setCurrentIndex((i) => i + 1);
  }, [currentIndex, suggestions.length]);

  const updateCurrentCities = useCallback((cities: CitySuggestion[]) => {
    setSuggestions((prev) => {
      const updated = [...prev];
      updated[currentIndex] = { ...updated[currentIndex], cities };
      return updated;
    });
  }, [currentIndex]);

  const confirmCities = useCallback(async () => {
    if (!preferences || !currentSuggestion) return;
    setStep("generating-schedule");
    setError(null);

    try {
      const res = await fetch("/api/generate-itinerary", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          step: "schedule",
          preferences,
          cities: currentSuggestion.cities,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || `API error: ${res.status}`);
      }

      const schedule: GeneratedDay[] = await res.json();
      setSuggestions((prev) => {
        const updated = [...prev];
        updated[currentIndex] = { ...updated[currentIndex], schedule };
        return updated;
      });
      setStep("complete");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to generate schedule");
      setStep("reviewing");
    }
  }, [preferences, currentSuggestion, currentIndex]);

  /** Convert the AI output into a full ItineraryData object */
  const getItineraryData = useCallback(
    (tripTitle: string, startDate: string): ItineraryData | null => {
      if (!currentSuggestion?.schedule || !preferences) return null;

      const titleParts = tripTitle.toUpperCase().split(/\s+/).slice(0, 4);
      while (titleParts.length < 4) titleParts.push("");

      // Build cities record
      const cities: Record<string, CityData> = {};
      for (const cs of currentSuggestion.cities) {
        const cityId = cs.name.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-");
        const nameParts = cs.name.toUpperCase();
        const mid = Math.ceil(nameParts.length / 2);
        cities[cityId] = {
          name: cs.name,
          splitName: [nameParts.slice(0, mid), nameParts.slice(mid) || "."],
          country: cs.country,
          countryLabel: cs.country.toUpperCase().replace("SWITZERLAND", "SWISS"),
          lat: 47.0,
          lng: 8.0,
          description: cs.reason,
          mapZoom: 13,
        };
      }

      // Build days
      const WEEKDAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
      const days: DayData[] = [];
      let dayNumber = 1;
      const base = new Date(startDate + "T12:00:00");

      for (let i = 0; i < currentSuggestion.schedule.length; i++) {
        const gd = currentSuggestion.schedule[i];
        const dateObj = new Date(base);
        dateObj.setDate(dateObj.getDate() + i);

        const y = dateObj.getFullYear();
        const m = String(dateObj.getMonth() + 1).padStart(2, "0");
        const d = String(dateObj.getDate()).padStart(2, "0");
        const dateStr = `${y}-${m}-${d}`;

        const cityId = gd.cityName.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-");

        days.push({
          dayNumber: dayNumber++,
          date: dateStr,
          weekday: WEEKDAYS[dateObj.getDay()],
          cityId,
          route: gd.route || gd.cityName.toUpperCase(),
          accommodation: gd.accommodation || "",
          events: gd.events.map((e) => ({
            time: e.time,
            title: e.title,
            type: e.type as DayData["events"][0]["type"],
            highlight: e.highlight,
          })),
          gallery: [
            { url: null, caption: null, size: "large" as const, slot: "A" },
            { url: null, caption: null, size: "medium" as const, slot: "B" },
            { url: null, caption: null, size: "medium" as const, slot: "C" },
          ],
        });
      }

      return {
        tripTitle: titleParts,
        travellers: preferences.travellers,
        origin: preferences.origin,
        cities,
        days,
      };
    },
    [currentSuggestion, preferences]
  );

  /** Go back one step in the wizard */
  const goBackStep = useCallback(() => {
    if (step === "complete") setStep("reviewing");
    else if (step === "reviewing") setStep("idle");
    else if (step === "generating-cities") setStep("idle");
    else if (step === "generating-schedule") setStep("reviewing");
  }, [step]);

  const reset = useCallback(() => {
    setStep("idle");
    setPreferences(null);
    setSuggestions([]);
    setCurrentIndex(0);
    setError(null);
  }, []);

  return {
    step,
    preferences,
    currentSuggestion,
    suggestions,
    currentIndex,
    error,
    generateCities,
    reshuffleCities,
    goBack,
    goForward,
    updateCurrentCities,
    confirmCities,
    getItineraryData,
    reset,
    addCityViaAI,
    isAddingCity,
    goBackStep,
  };
}
