"use client";

import { useState, useEffect } from "react";
import { saveTripPassphrase, saveTrip } from "@/lib/tripStore";
import { isSupabaseEnabled, loadTripByPassphrase } from "@/lib/supabaseSync";
import type { ItineraryData } from "@/types/itinerary";

interface LandingPageProps {
  onSelectTrip: (tripId: string) => void;
  onStartNew: () => void;
}

export default function LandingPage({ onSelectTrip, onStartNew }: LandingPageProps) {
  const [showPassphraseInput, setShowPassphraseInput] = useState(false);
  const [passphrase, setPassphrase] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [cloudEnabled, setCloudEnabled] = useState(false);

  useEffect(() => {
    setCloudEnabled(isSupabaseEnabled());
  }, []);

  const handleContinue = async () => {
    if (!passphrase.trim()) {
      setError("Enter your passphrase");
      return;
    }

    setLoading(true);
    setError("");

    const result = await loadTripByPassphrase(passphrase.trim());

    if (!result) {
      setError("No trip found for this passphrase");
      setLoading(false);
      return;
    }

    // Save trip locally + store passphrase for future syncing
    const data = result.data as ItineraryData;
    saveTrip(result.id, data);
    saveTripPassphrase(result.id, passphrase.trim());

    setLoading(false);
    onSelectTrip(result.id);
  };

  // Google Maps terrain, zoomed out
  const mapSrc = `https://www.google.com/maps/embed?pb=!1m14!1m12!1m3!1d6000000!2d11.2!3d47.0!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!5e0!3m2!1sen!2s!4v1`;

  return (
    <div className="relative h-screen w-full overflow-hidden bg-neutral-200">
      {/* Grayscale terrain map */}
      <iframe
        src={mapSrc}
        className="absolute inset-0 w-full h-full border-0 pointer-events-none"
        style={{ filter: "grayscale(1) contrast(1.1)" }}
        loading="eager"
        tabIndex={-1}
      />

      {/* White overlay */}
      <div className="absolute inset-0 bg-white/30" />

      {/* Content */}
      <div className="absolute z-20 inset-0 flex flex-col items-center justify-center">
        {/* Title */}
        <h1 className="text-[12vw] font-black uppercase tracking-tighter leading-none text-center text-black select-none">
          PLAN A TRIP
        </h1>

        <div className="w-12 h-0.5 bg-black/20 mt-6 mb-8" />

        {/* Two buttons */}
        <div className="flex gap-5">
          {/* Start New */}
          <button
            onClick={onStartNew}
            className="bg-white text-black text-sm font-bold uppercase tracking-widest px-10 py-3.5 hover:bg-neutral-100 w-56 border-2 border-black"
          >
            + New Trip
          </button>

          {/* Continue Planning */}
          {cloudEnabled ? (
            <div className="relative">
              {!showPassphraseInput ? (
                <button
                  onClick={() => setShowPassphraseInput(true)}
                  className="bg-black text-white text-sm font-bold uppercase tracking-widest px-10 py-3.5 hover:bg-neutral-800 w-56"
                >
                  Continue Planning &rarr;
                </button>
              ) : (
                <div className="bg-white border-2 border-black flex items-stretch w-56">
                  <input
                    autoFocus
                    type="password"
                    value={passphrase}
                    onChange={(e) => { setPassphrase(e.target.value); setError(""); }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") handleContinue();
                      if (e.key === "Escape") {
                        setShowPassphraseInput(false);
                        setPassphrase("");
                        setError("");
                      }
                    }}
                    placeholder="(passkey here)"
                    className="flex-1 px-4 py-3 text-sm font-bold uppercase tracking-wide text-black placeholder:text-black/25 focus:outline-none bg-transparent"
                  />
                  <button
                    onClick={handleContinue}
                    disabled={loading || !passphrase.trim()}
                    className="bg-black text-white text-[10px] font-bold uppercase tracking-widest px-4 hover:bg-neutral-800 disabled:bg-neutral-300 disabled:text-neutral-500 shrink-0"
                  >
                    {loading ? "..." : "Go"}
                  </button>
                </div>
              )}

              {/* Error */}
              {error && (
                <p className="absolute top-full mt-2 text-[10px] font-bold uppercase tracking-widest text-red-500 text-center w-full">
                  {error}
                </p>
              )}
            </div>
          ) : (
            <button
              onClick={onStartNew}
              className="bg-neutral-300 text-neutral-500 text-sm font-bold uppercase tracking-widest px-10 py-3.5 w-56 cursor-not-allowed"
              disabled
              title="Cloud sync not configured"
            >
              Continue Planning
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
