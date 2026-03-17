"use client";

import { useState } from "react";
import { useWeather } from "@/hooks/useWeather";

interface WeatherWidgetProps {
  lat: number;
  lng: number;
  date: string; // "2026-03-26"
  cityName?: string;
  onUpdateLocation?: (lat: number, lng: number) => void;
  locked?: boolean;
}

export default function WeatherWidget({ lat, lng, date, cityName, onUpdateLocation, locked }: WeatherWidgetProps) {
  const { weather, loading } = useWeather(lat, lng, date);
  const dateObj = new Date(date + "T12:00:00");
  const dateNum = dateObj.getDate();
  const monthStr = dateObj.toLocaleString("en-GB", { month: "short" }).toUpperCase();
  const [editing, setEditing] = useState(false);
  const [locInput, setLocInput] = useState("");
  const [geocoding, setGeocoding] = useState(false);

  const handleGeocode = async () => {
    if (!locInput.trim()) return;
    setGeocoding(true);
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(locInput)}&format=json&limit=1`
      );
      const results = await res.json();
      if (results?.[0] && onUpdateLocation) {
        onUpdateLocation(parseFloat(results[0].lat), parseFloat(results[0].lon));
        setEditing(false);
        setLocInput("");
      }
    } catch { /* silent */ }
    setGeocoding(false);
  };

  return (
    <div className="group/weather">
      {/* Location line — above weather data */}
      {onUpdateLocation && !locked && (
        <div className="mb-2 flex items-center gap-2">
          {!editing ? (
            <>
              <span className="text-[11px] uppercase tracking-widest text-[#4A7C9B] font-bold">
                {cityName || "No location"}
              </span>
              <button
                onClick={() => setEditing(true)}
                className="text-base text-[#4A7C9B] hover:text-[#2d5a75] opacity-60 hover:opacity-100 inline-block -scale-x-100"
                title="Change location"
              >
                ✎
              </button>
            </>
          ) : (
            <>
              <input
                autoFocus
                value={locInput}
                onChange={(e) => setLocInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleGeocode();
                  if (e.key === "Escape") { setEditing(false); setLocInput(""); }
                }}
                placeholder="City or place"
                className="text-[11px] uppercase tracking-widest bg-transparent border-b border-[#4A7C9B] focus:border-black focus:outline-none w-36"
              />
              <button
                onClick={handleGeocode}
                disabled={geocoding || !locInput.trim()}
                className="text-[11px] uppercase tracking-widest text-[#4A7C9B] hover:text-black disabled:text-neutral-200 font-bold"
              >
                {geocoding ? "..." : "Set"}
              </button>
              <button
                onClick={() => { setEditing(false); setLocInput(""); }}
                className="text-xs text-neutral-400 hover:text-black"
              >
                &times;
              </button>
            </>
          )}
        </div>
      )}

      {/* Location — read-only when locked */}
      {locked && cityName && (
        <div className="mb-2">
          <span className="text-[11px] uppercase tracking-widest text-[#4A7C9B] font-bold">
            {cityName}
          </span>
        </div>
      )}

      {/* Weather data row */}
      <div className="flex items-start gap-4">
        {/* Date number + month stacked */}
        <div className="text-center leading-none">
          <div className="text-3xl font-black tabular-nums">{dateNum}</div>
          <div className="text-[9px] font-bold uppercase tracking-widest text-neutral-400 mt-0.5">{monthStr}</div>
        </div>

        {/* Weather icon */}
        <div className="text-2xl leading-none mt-0.5">
          {loading ? (
            <span className="text-neutral-300">--</span>
          ) : (
            weather?.icon ?? "--"
          )}
        </div>

        {/* Temperatures (swapped — now before rise/set) */}
        <div className="text-xs leading-snug">
          <div className="font-bold text-neutral-800 text-sm">
            {loading ? "--" : `${weather?.temperatureMax ?? "--"}°`}
          </div>
          <div className="text-neutral-400">
            {loading ? "--" : `${weather?.temperatureMin ?? "--"}°`}
          </div>
        </div>

        {/* Divider */}
        <div className="w-px h-8 bg-neutral-300 mx-1" />

        {/* Rise / Set times (swapped — now after temps) */}
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
      </div>
    </div>
  );
}
