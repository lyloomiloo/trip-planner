"use client";

import { useWeather } from "@/hooks/useWeather";

interface WeatherWidgetProps {
  lat: number;
  lng: number;
  date: string; // "2026-03-26"
}

export default function WeatherWidget({ lat, lng, date }: WeatherWidgetProps) {
  const { weather, loading } = useWeather(lat, lng, date);
  const dateNum = new Date(date).getDate();

  return (
    <div className="flex items-start gap-4">
      {/* Date number */}
      <div className="text-3xl font-black tabular-nums leading-none">
        {dateNum}
      </div>

      {/* Weather icon */}
      <div className="text-2xl leading-none mt-0.5">
        {loading ? (
          <span className="text-neutral-300">--</span>
        ) : (
          weather?.icon ?? "--"
        )}
      </div>

      {/* Rise / Set times */}
      <div className="text-xs text-neutral-500 leading-snug">
        <div className="flex gap-2">
          <span className="text-neutral-400">Rise</span>
          <span className="font-semibold text-neutral-700 tabular-nums">
            {loading ? "--:--" : weather?.sunrise ?? "--:--"}
          </span>
        </div>
        <div className="flex gap-2">
          <span className="text-neutral-400">Set</span>
          <span className="font-semibold text-neutral-700 tabular-nums">
            {loading ? "--:--" : weather?.sunset ?? "--:--"}
          </span>
        </div>
      </div>

      {/* Divider */}
      <div className="w-px h-8 bg-neutral-300 mx-1" />

      {/* Temperatures */}
      <div className="text-xs leading-snug">
        <div className="font-bold text-neutral-800 text-sm">
          {loading ? "--" : `${weather?.temperatureMax ?? "--"}°`}
        </div>
        <div className="text-neutral-400">
          {loading ? "--" : `${weather?.temperatureMin ?? "--"}°`}
        </div>
      </div>
    </div>
  );
}
