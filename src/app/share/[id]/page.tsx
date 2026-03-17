"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { loadTrip } from "@/lib/tripStore";
import type { ItineraryData } from "@/types/itinerary";

export default function SharePage() {
  const params = useParams();
  const router = useRouter();
  const tripId = params.id as string;
  const [trip, setTrip] = useState<ItineraryData | null>(null);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    const data = loadTrip(tripId);
    if (data) {
      setTrip(data);
    } else {
      setNotFound(true);
    }
  }, [tripId]);

  if (notFound) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-4xl font-black uppercase tracking-tight mb-4">
            Trip Not Found
          </h1>
          <p className="text-sm text-neutral-400 uppercase tracking-widest mb-8">
            This trip may have been deleted or the link is invalid.
          </p>
          <button
            onClick={() => router.push("/")}
            className="bg-black text-white text-sm font-bold uppercase tracking-widest px-8 py-3 hover:bg-neutral-800"
          >
            Go Home
          </button>
        </div>
      </div>
    );
  }

  if (!trip) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <p className="text-sm text-neutral-400 uppercase tracking-widest animate-pulse">
          Loading...
        </p>
      </div>
    );
  }

  const title = trip.tripTitle.join(" ");
  const firstDay = trip.days[0];
  const lastDay = trip.days[trip.days.length - 1];
  const cityNames = Object.values(trip.cities).map((c) => c.name).join(" \u2192 ");

  return (
    <div className="min-h-screen bg-white flex items-center justify-center p-6">
      <div className="w-full max-w-md text-center">
        {/* Trip title */}
        <h1 className="text-4xl font-black uppercase tracking-tight leading-tight mb-2">
          {title}
        </h1>

        {/* Trip meta */}
        <p className="text-[10px] text-neutral-400 uppercase tracking-widest mb-1">
          {trip.days.length} days &middot;{" "}
          {Object.keys(trip.cities).length} cities
        </p>
        {firstDay && lastDay && (
          <p className="text-[10px] text-neutral-400 uppercase tracking-widest mb-1">
            {firstDay.date} &rarr; {lastDay.date}
          </p>
        )}
        <p className="text-[10px] text-neutral-300 uppercase tracking-widest mb-10">
          {cityNames}
        </p>

        {/* Divider */}
        <div className="w-12 h-0.5 bg-black mx-auto mb-10" />

        {/* Two buttons */}
        <div className="space-y-4">
          <button
            onClick={() => {
              // Navigate to main app and open the trip in itinerary view
              window.location.href = `/?trip=${tripId}&view=itinerary`;
            }}
            className="w-full bg-black text-white text-sm font-bold uppercase tracking-widest py-4 hover:bg-neutral-800 transition-colors"
          >
            Itinerary
          </button>

          <button
            onClick={() => {
              // Navigate to main app and open the trip in overview view
              window.location.href = `/?trip=${tripId}&view=overview`;
            }}
            className="w-full bg-white text-black text-sm font-bold uppercase tracking-widest py-4 border-2 border-black hover:bg-neutral-50 transition-colors"
          >
            Overview
          </button>
        </div>

        {/* Footer */}
        <p className="text-[8px] text-neutral-300 uppercase tracking-widest mt-12">
          Trip data stored locally in your browser
        </p>
      </div>
    </div>
  );
}
