"use client";

import { useRef, useState } from "react";

interface NewTripData {
  title: string;
  startDate: string;
  endDate: string;
  startCity: string;
  endCity: string;
}

interface NewTripFormProps {
  onBack: () => void;
  onCreateBlank: (data: NewTripData) => void;
  onImport: (file: File) => void;
}

export default function NewTripForm({ onBack, onCreateBlank, onImport }: NewTripFormProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [title, setTitle] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [startCity, setStartCity] = useState("");
  const [endCity, setEndCity] = useState("");

  const canCreate = title.trim() && startDate;

  return (
    <div className="relative h-screen w-full overflow-hidden bg-white">
      {/* Back button */}
      <button
        onClick={onBack}
        className="absolute top-8 left-8 z-10 text-xs font-bold uppercase tracking-widest text-black/40 hover:text-black"
      >
        &larr; Back
      </button>

      {/* Centered form */}
      <div className="h-full flex flex-col items-center justify-center">
        <h1 className="text-[6vw] font-black uppercase tracking-tighter leading-none text-black mb-12">
          NEW TRIP
        </h1>

        <div className="w-full max-w-md space-y-6">
          {/* Title */}
          <div>
            <label className="block text-[10px] font-bold uppercase tracking-widest text-black/40 mb-2">
              Trip Title
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Europe Alps Tour"
              className="w-full border-b-2 border-black bg-transparent py-2 text-lg font-bold uppercase tracking-wide text-black placeholder:text-black/20 focus:outline-none"
            />
          </div>

          {/* Dates row */}
          <div className="flex gap-6">
            <div className="flex-1">
              <label className="block text-[10px] font-bold uppercase tracking-widest text-black/40 mb-2">
                Start Date
              </label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full border-b-2 border-black bg-transparent py-2 text-sm font-mono text-black focus:outline-none"
              />
            </div>
            <div className="flex-1">
              <label className="block text-[10px] font-bold uppercase tracking-widest text-black/40 mb-2">
                End Date
              </label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full border-b-2 border-black bg-transparent py-2 text-sm font-mono text-black focus:outline-none"
              />
            </div>
          </div>

          {/* Cities row */}
          <div className="flex gap-6">
            <div className="flex-1">
              <label className="block text-[10px] font-bold uppercase tracking-widest text-black/40 mb-2">
                From
              </label>
              <input
                type="text"
                value={startCity}
                onChange={(e) => setStartCity(e.target.value)}
                placeholder="e.g. Singapore"
                className="w-full border-b-2 border-black bg-transparent py-2 text-sm font-bold uppercase tracking-wide text-black placeholder:text-black/20 focus:outline-none"
              />
            </div>
            <div className="flex-1">
              <label className="block text-[10px] font-bold uppercase tracking-widest text-black/40 mb-2">
                To
              </label>
              <input
                type="text"
                value={endCity}
                onChange={(e) => setEndCity(e.target.value)}
                placeholder="e.g. Vienna"
                className="w-full border-b-2 border-black bg-transparent py-2 text-sm font-bold uppercase tracking-wide text-black placeholder:text-black/20 focus:outline-none"
              />
            </div>
          </div>

          {/* Divider */}
          <div className="w-full h-px bg-black/10 my-2" />

          {/* Actions */}
          <div className="flex gap-4 pt-2">
            <button
              onClick={() => {
                if (canCreate) {
                  onCreateBlank({ title, startDate, endDate, startCity, endCity });
                }
              }}
              disabled={!canCreate}
              className={`flex-1 py-3 text-xs font-bold uppercase tracking-widest border-2 border-black ${
                canCreate
                  ? "bg-black text-white hover:bg-neutral-800"
                  : "bg-neutral-100 text-black/30 border-black/20 cursor-not-allowed"
              }`}
            >
              Create Trip
            </button>

            <button
              onClick={() => fileInputRef.current?.click()}
              className="flex-1 py-3 text-xs font-bold uppercase tracking-widest border-2 border-dashed border-black bg-white hover:bg-neutral-50 text-black"
            >
              Upload JSON
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".json"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) onImport(file);
              }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
