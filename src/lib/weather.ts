// src/lib/weather.ts

import type { WeatherData } from "@/types/itinerary";

export async function getWeather(
  lat: number,
  lng: number,
  date: string
): Promise<WeatherData | null> {
  try {
    const today = new Date();
    const target = new Date(date);
    const diffDays = Math.ceil((target.getTime() - today.getTime()) / 86400000);

    let url: string;
    if (diffDays >= 0 && diffDays <= 16) {
      url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&daily=temperature_2m_max,temperature_2m_min,weathercode,sunrise,sunset&timezone=auto&start_date=${date}&end_date=${date}`;
    } else {
      // Use previous year's historical data as estimate
      const prevYear = target.getFullYear() - 1;
      const histDate = date.replace(String(target.getFullYear()), String(prevYear));
      url = `https://archive-api.open-meteo.com/v1/archive?latitude=${lat}&longitude=${lng}&daily=temperature_2m_max,temperature_2m_min,weathercode,sunrise,sunset&timezone=auto&start_date=${histDate}&end_date=${histDate}`;
    }

    const res = await fetch(url);
    if (!res.ok) return null;
    const data = await res.json();
    const d = data.daily;
    if (!d?.temperature_2m_max?.[0]) return null;

    return {
      temperature: Math.round((d.temperature_2m_max[0] + d.temperature_2m_min[0]) / 2),
      temperatureMax: Math.round(d.temperature_2m_max[0]),
      temperatureMin: Math.round(d.temperature_2m_min[0]),
      condition: codeToCondition(d.weathercode?.[0] ?? 0),
      icon: codeToEmoji(d.weathercode?.[0] ?? 0),
      sunrise: fmtTime(d.sunrise?.[0]),
      sunset: fmtTime(d.sunset?.[0]),
    };
  } catch {
    return null;
  }
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
