// src/lib/weather.ts

import type { WeatherData } from "@/types/itinerary";

export async function getWeather(
  lat: number,
  lng: number,
  date: string
): Promise<WeatherData | null> {
  try {
    const today = new Date();
    const target = new Date(date + "T00:00:00");
    const diffDays = Math.ceil((target.getTime() - today.getTime()) / 86400000);

    // Try forecast API if within 16 days
    if (diffDays >= 0 && diffDays <= 16) {
      const forecastUrl = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&daily=temperature_2m_max,temperature_2m_min,weathercode,sunrise,sunset&timezone=auto&start_date=${date}&end_date=${date}`;
      const res = await fetch(forecastUrl);
      if (res.ok) {
        const result = parseWeatherResponse(await res.json());
        if (result) return result;
      }
    }

    // Fall back to historical data from the previous year
    const prevYear = target.getFullYear() - 1;
    const histDate = date.replace(String(target.getFullYear()), String(prevYear));
    const histUrl = `https://archive-api.open-meteo.com/v1/archive?latitude=${lat}&longitude=${lng}&daily=temperature_2m_max,temperature_2m_min,weathercode,sunrise,sunset&timezone=auto&start_date=${histDate}&end_date=${histDate}`;
    const histRes = await fetch(histUrl);
    if (!histRes.ok) return null;
    return parseWeatherResponse(await histRes.json());
  } catch {
    return null;
  }
}

function parseWeatherResponse(data: Record<string, unknown>): WeatherData | null {
  const d = data.daily as Record<string, unknown[]> | undefined;
  if (!d?.temperature_2m_max?.[0]) return null;

  return {
    temperature: Math.round(((d.temperature_2m_max[0] as number) + (d.temperature_2m_min[0] as number)) / 2),
    temperatureMax: Math.round(d.temperature_2m_max[0] as number),
    temperatureMin: Math.round(d.temperature_2m_min[0] as number),
    condition: codeToCondition((d.weathercode?.[0] as number) ?? 0),
    icon: codeToEmoji((d.weathercode?.[0] as number) ?? 0),
    sunrise: fmtTime(d.sunrise?.[0] as string | undefined),
    sunset: fmtTime(d.sunset?.[0] as string | undefined),
  };
}

function fmtTime(iso: string | undefined): string {
  if (!iso) return "--:--";
  const d = new Date(iso);
  return d.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
}

function codeToCondition(c: number): string {
  if (c === 0) return "Clear sky";
  if (c <= 2) return "Partly cloudy";
  if (c === 3) return "Overcast";
  if (c <= 48) return "Foggy";
  if (c <= 55) return "Drizzle";
  if (c <= 65) return "Rain";
  if (c <= 77) return "Snow";
  if (c <= 82) return "Showers";
  return "Thunderstorm";
}

function codeToEmoji(c: number): string {
  if (c === 0) return "☀️";
  if (c <= 2) return "⛅";
  if (c === 3) return "☁️";
  if (c <= 48) return "🌫️";
  if (c <= 55) return "🌦️";
  if (c <= 65) return "🌧️";
  if (c <= 77) return "🌨️";
  if (c <= 82) return "🌦️";
  return "⛈️";
}
