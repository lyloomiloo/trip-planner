"use client";

import { useEffect, useState } from "react";
import type { WeatherData } from "@/types/itinerary";
import { getWeather } from "@/lib/weather";

// Simple in-memory cache keyed by "lat,lng,date"
const cache = new Map<string, WeatherData | null>();

export function useWeather(lat: number, lng: number, date: string) {
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const key = `${lat},${lng},${date}`;
    if (cache.has(key)) {
      setWeather(cache.get(key)!);
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);

    getWeather(lat, lng, date).then((data) => {
      if (!cancelled) {
        cache.set(key, data);
        setWeather(data);
        setLoading(false);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [lat, lng, date]);

  return { weather, loading };
}
