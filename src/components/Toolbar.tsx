"use client";

import { useState } from "react";

type SyncStatus = "idle" | "syncing" | "synced" | "error" | "offline";

interface ToolbarProps {
  onShare: () => void;
  onOverview: () => void;
  onAddDay: () => void;
  onAddCity: (cityName: string) => void;
  onBack: () => void;
  locked: boolean;
  onToggleLock: () => void;
  syncStatus?: SyncStatus;
  onPublish?: () => void; // publish to cloud (set passphrase)
}

export default function Toolbar({
  onShare,
  onOverview,
  onAddDay,
  onAddCity,
  onBack,
  locked,
  onToggleLock,
  syncStatus,
  onPublish,
}: ToolbarProps) {
  const [showCityInput, setShowCityInput] = useState(false);
  const [cityInput, setCityInput] = useState("");

  const handleCitySubmit = () => {
    if (cityInput.trim()) {
      onAddCity(cityInput.trim());
      setCityInput("");
      setShowCityInput(false);
    }
  };

  const btnClass =
    "text-[10px] font-bold uppercase tracking-widest text-neutral-500 hover:text-black transition-colors";

  return (
    <div
      className="sticky top-0 z-40 bg-white border-b-2 border-black flex items-center justify-between px-6"
      style={{ height: "var(--toolbar-h)" }}
    >
      <button
        onClick={onBack}
        className="text-xs font-bold uppercase tracking-widest text-neutral-400 hover:text-black"
      >
        &larr; Back
      </button>

      <div className="flex items-center gap-5">
        {/* Lock toggle */}
        <button
          onClick={onToggleLock}
          className={`text-[10px] font-bold uppercase tracking-widest transition-colors ${
            locked ? "text-[#C80815]" : "text-neutral-500 hover:text-black"
          }`}
          title={locked ? "Unlock editing" : "Lock editing"}
        >
          {locked ? "\u{1F512} Locked" : "\u{1F513} Unlocked"}
        </button>

        <span className="text-neutral-200">|</span>

        {!locked && (
          <>
            <button onClick={onAddDay} className={btnClass}>
              + Day
            </button>

            {!showCityInput ? (
              <button onClick={() => setShowCityInput(true)} className={btnClass}>
                + City
              </button>
            ) : (
              <div className="flex items-center gap-2">
                <input
                  autoFocus
                  value={cityInput}
                  onChange={(e) => setCityInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleCitySubmit();
                    if (e.key === "Escape") { setShowCityInput(false); setCityInput(""); }
                  }}
                  placeholder="City name"
                  className="border-b-2 border-black bg-transparent py-0.5 text-[10px] font-bold uppercase tracking-wide focus:outline-none w-28"
                />
                <button
                  onClick={handleCitySubmit}
                  disabled={!cityInput.trim()}
                  className="text-[10px] font-bold uppercase tracking-widest bg-black text-white px-2 py-0.5 hover:bg-neutral-800 disabled:bg-neutral-200 disabled:text-neutral-400"
                >
                  Add
                </button>
                <button
                  onClick={() => { setShowCityInput(false); setCityInput(""); }}
                  className="text-[10px] font-bold uppercase tracking-widest text-neutral-400 hover:text-black"
                >
                  &times;
                </button>
              </div>
            )}

            <span className="text-neutral-200">|</span>
          </>
        )}

        <button onClick={onShare} className={btnClass}>
          Share
        </button>

        {/* Publish to cloud — red and prominent when not yet published */}
        {onPublish && (
          <>
            <span className="text-neutral-200">|</span>
            <button
              onClick={onPublish}
              className="text-[10px] font-bold uppercase tracking-widest text-white bg-[#C80815] px-3 py-1 hover:bg-[#a00610] transition-colors animate-pulse"
            >
              Publish
            </button>
          </>
        )}

        {/* Sync status indicator */}
        {syncStatus && syncStatus !== "idle" && syncStatus !== "offline" && (
          <>
            <span
              className={`w-2 h-2 rounded-full shrink-0 ${
                syncStatus === "synced" ? "bg-neutral-400" :
                syncStatus === "syncing" ? "bg-neutral-300 animate-pulse" :
                "bg-neutral-500"
              }`}
              title={
                syncStatus === "synced" ? "Synced to cloud" :
                syncStatus === "syncing" ? "Syncing..." :
                "Sync error"
              }
            />
          </>
        )}

        <span className="text-neutral-200">|</span>

        <button onClick={onOverview} className={btnClass}>
          Overview
        </button>

      </div>
    </div>
  );
}
