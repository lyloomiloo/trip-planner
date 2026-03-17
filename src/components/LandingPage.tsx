"use client";

import { useState, useEffect } from "react";
import { listTrips, loadTrip, saveTrip, deleteTrip, type TripMeta } from "@/lib/tripStore";
import type { ItineraryData } from "@/types/itinerary";
import rawData from "@/../data/itinerary.json";

const DEFAULT_TRIP_ID = "europe-alps-tour";

interface LandingPageProps {
  onSelectTrip: (tripId: string) => void;
  onStartNew: () => void;
}

export default function LandingPage({ onSelectTrip, onStartNew }: LandingPageProps) {
  const [showTrips, setShowTrips] = useState(false);
  const [savedTrips, setSavedTrips] = useState<TripMeta[]>([]);

  // Seed default trip + load saved trips from localStorage on mount
  useEffect(() => {
    if (!loadTrip(DEFAULT_TRIP_ID)) {
      saveTrip(DEFAULT_TRIP_ID, rawData as unknown as ItineraryData);
    }
    setSavedTrips(listTrips());
  }, []);

  // Format date for display: "Mar 2026"
  const formatMonth = (dateStr: string) => {
    if (!dateStr) return "";
    const d = new Date(dateStr + "T12:00:00");
    return d.toLocaleDateString("en-US", { month: "short", year: "numeric" }).toUpperCase();
  };

  // Google Maps terrain, zoomed out
  const mapSrc = `https://www.google.com/maps/embed?pb=!1m14!1m12!1m3!1d6000000!2d11.2!3d47.0!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!5e0!3m2!1sen!2s!4v1`;

  return (
    <div className="relative h-screen w-full overflow-hidden bg-neutral-200">
      {/* Grayscale terrain map — no pins */}
      <iframe
        src={mapSrc}
        className="absolute inset-0 w-full h-full border-0 pointer-events-none"
        style={{ filter: "grayscale(1) contrast(1.1)" }}
        loading="eager"
        tabIndex={-1}
      />

      {/* White overlay for readability */}
      <div className="absolute inset-0 bg-white/30" />

      {/* Content — centered */}
      <div className="absolute z-20 inset-0 flex flex-col items-center justify-center">
        {/* Title */}
        <h1 className="text-[12vw] font-black uppercase tracking-tighter leading-none text-center text-black select-none">
          PLAN A TRIP
        </h1>

        {/* Divider */}
        <div className="w-12 h-0.5 bg-black/20 mt-6 mb-6" />

        {/* Actions */}
        <div className="flex flex-col items-center">
          <div className="flex gap-5">
            {/* Start New */}
            <div className="flex flex-col items-center">
              <button
                onClick={onStartNew}
                className="bg-white text-black text-sm font-bold uppercase tracking-widest px-10 py-3.5 hover:bg-neutral-100 w-72 border-2 border-black"
              >
                Start New
              </button>
            </div>

            {/* Continue Plan */}
            <div className="relative flex flex-col items-center">
              <button
                onClick={() => setShowTrips(!showTrips)}
                className={`text-sm font-bold uppercase tracking-widest px-10 py-3.5 w-72 ${
                  savedTrips.length === 0
                    ? "bg-neutral-300 text-neutral-500 cursor-not-allowed"
                    : "bg-black text-white hover:bg-neutral-800"
                }`}
                disabled={savedTrips.length === 0}
              >
                Continue Plan &rarr;
              </button>

              {/* Trip cards — dynamically from localStorage */}
              {showTrips && savedTrips.length > 0 && (
                <div className="absolute top-full mt-4 left-0 flex gap-2">
                  {savedTrips.map((trip) => (
                    <div key={trip.id} className="relative group">
                      <button
                        onClick={() => onSelectTrip(trip.id)}
                        className="w-40 border-2 border-solid border-black px-2.5 py-1.5 hover:bg-neutral-50 text-left bg-white"
                      >
                        <span className="text-[10px] font-bold text-black block uppercase tracking-wider">
                          {trip.title}
                        </span>
                        <span className="font-mono text-[8px] uppercase tracking-[0.15em] text-black/50 mt-0.5 block leading-relaxed">
                          {trip.startCity && trip.endCity
                            ? `${trip.startCity} to ${trip.endCity}`
                            : "New trip"}
                          <br />
                          {trip.totalDays} days{trip.startDate ? ` / ${formatMonth(trip.startDate)}` : ""}
                        </span>
                      </button>
                      {/* Delete button — hover only */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteTrip(trip.id);
                          setSavedTrips(listTrips());
                        }}
                        className="absolute -top-2 -right-2 w-5 h-5 bg-black text-white text-xs flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600"
                      >
                        &times;
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
