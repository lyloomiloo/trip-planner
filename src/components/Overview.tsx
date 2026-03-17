"use client";

import { useState } from "react";
import type { ItineraryData } from "@/types/itinerary";
import WeatherWidget from "./WeatherWidget";
import { exportOverviewToPdf } from "@/lib/exportPdf";

interface OverviewProps {
  data: ItineraryData;
  onClose: () => void;
  onMoveDay: (fromIndex: number, toIndex: number) => void;
  onRemoveDay: (dayIndex: number) => void;
  onMoveCityBlock?: (cityId: string, direction: "up" | "down") => void;
}

export default function Overview({ data, onClose, onMoveDay, onRemoveDay, onMoveCityBlock }: OverviewProps) {
  const [downloading, setDownloading] = useState(false);
  const [dragIdx, setDragIdx] = useState<number | null>(null);
  const [dragOverIdx, setDragOverIdx] = useState<number | null>(null);
  const [confirmRemove, setConfirmRemove] = useState<number | null>(null);

  const handleDownloadPDF = async () => {
    setDownloading(true);
    await exportOverviewToPdf("[data-overview-content]", "trip-overview.pdf");
    setDownloading(false);
  };

  const handleDragStart = (idx: number) => {
    setDragIdx(idx);
  };

  const handleDragOver = (e: React.DragEvent, idx: number) => {
    e.preventDefault();
    setDragOverIdx(idx);
  };

  const handleDrop = (toIdx: number) => {
    if (dragIdx !== null && dragIdx !== toIdx) {
      onMoveDay(dragIdx, toIdx);
    }
    setDragIdx(null);
    setDragOverIdx(null);
  };

  const handleDragEnd = () => {
    setDragIdx(null);
    setDragOverIdx(null);
  };

  return (
    <div className="fixed inset-0 z-[60] bg-white overflow-y-auto">
      {/* Header */}
      <div
        className="sticky top-0 z-10 bg-white border-b-2 border-black flex items-center justify-between px-6"
        style={{ height: "var(--toolbar-h)" }}
      >
        <button
          onClick={onClose}
          className="text-xs font-bold uppercase tracking-widest text-neutral-400 hover:text-black"
        >
          &larr; Back
        </button>
        <h1 className="text-xs font-bold uppercase tracking-widest">
          Trip Overview
        </h1>
        <button
          onClick={handleDownloadPDF}
          disabled={downloading}
          className="text-[10px] font-bold uppercase tracking-widest text-neutral-500 hover:text-black"
        >
          {downloading ? "Downloading..." : "Download PDF"}
        </button>
      </div>

      {/* Content — captured for PDF, narrow max-width for mobile-friendly export */}
      <div data-overview-content className="max-w-[480px] mx-auto">
        {/* Trip header */}
        <div className="px-5 pt-8 pb-4">
          <h2 className="text-2xl font-black uppercase tracking-tight">
            {data.tripTitle.join(" ")}
          </h2>
          <p className="text-[10px] text-neutral-400 uppercase tracking-widest mt-2">
            {data.days.length} days &middot;{" "}
            {Object.keys(data.cities).length} cities &middot;{" "}
            {data.days[0]?.date} &rarr; {data.days[data.days.length - 1]?.date}
          </p>
          <p className="text-[9px] text-neutral-300 uppercase tracking-widest mt-1 print:hidden"
            data-no-pdf
          >
            Drag cards to reorder
          </p>
        </div>

        {/* Day-by-day cards — stacked, mobile-friendly */}
        <div className="px-5 pb-16 space-y-3">
          {data.days.map((day, idx) => {
            const city = data.cities[day.cityId];
            const dateObj = new Date(day.date + "T12:00:00");
            const dateNum = dateObj.getDate();
            const monthStr = dateObj
              .toLocaleString("en-GB", { month: "short" })
              .toUpperCase();
            const isDragging = dragIdx === idx;
            const isDragOver = dragOverIdx === idx && dragIdx !== idx;

            // Show city divider when city changes
            const prevDay = idx > 0 ? data.days[idx - 1] : null;
            const showCityHeader = !prevDay || prevDay.cityId !== day.cityId;

            return (
              <div key={`${day.dayNumber}-${idx}`}>
                {/* City divider */}
                {showCityHeader && city && (
                  <div className="flex items-center gap-3 mb-2 mt-4 first:mt-0 group/city">
                    <span className="text-[10px] font-bold uppercase tracking-widest bg-black text-white px-2.5 py-1">
                      {city.name}
                    </span>
                    {city.country && (
                      <span className="text-[9px] uppercase tracking-widest text-neutral-400">
                        {city.country}
                      </span>
                    )}
                    <div className="flex-1 h-px bg-neutral-200" />
                    {/* City reorder arrows */}
                    {onMoveCityBlock && (
                      <div className="flex gap-1 opacity-0 group-hover/city:opacity-100 transition-opacity" data-no-pdf>
                        <button
                          onClick={() => onMoveCityBlock(day.cityId, "up")}
                          className="w-6 h-6 text-[10px] border border-neutral-300 bg-white hover:bg-neutral-100 flex items-center justify-center"
                          title="Move city up"
                        >
                          ↑
                        </button>
                        <button
                          onClick={() => onMoveCityBlock(day.cityId, "down")}
                          className="w-6 h-6 text-[10px] border border-neutral-300 bg-white hover:bg-neutral-100 flex items-center justify-center"
                          title="Move city down"
                        >
                          ↓
                        </button>
                      </div>
                    )}
                  </div>
                )}

                {/* Day card */}
                <div
                  draggable
                  onDragStart={() => handleDragStart(idx)}
                  onDragOver={(e) => handleDragOver(e, idx)}
                  onDrop={() => handleDrop(idx)}
                  onDragEnd={handleDragEnd}
                  className={`
                    group/card border border-neutral-200 rounded-sm p-4 cursor-grab active:cursor-grabbing transition-all relative
                    ${isDragging ? "opacity-40 scale-[0.98]" : ""}
                    ${isDragOver ? "border-dashed border-neutral-400 bg-neutral-50" : "bg-white hover:bg-neutral-50"}
                  `}
                >
                  {/* Remove x button — top right, matching landing page style */}
                  {confirmRemove === idx ? (
                    <div className="absolute -top-2 -right-2 flex items-center gap-2 bg-white border-2 border-black px-3 py-1.5 z-10">
                      <span className="text-[9px] font-bold uppercase tracking-widest">Remove Day {day.dayNumber}?</span>
                      <button
                        onClick={(e) => { e.stopPropagation(); onRemoveDay(idx); setConfirmRemove(null); }}
                        className="text-[9px] font-bold uppercase tracking-widest bg-black text-white px-2 py-0.5 hover:bg-red-700"
                      >
                        Yes
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); setConfirmRemove(null); }}
                        className="text-[9px] font-bold uppercase tracking-widest text-neutral-400 hover:text-black"
                      >
                        No
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={(e) => { e.stopPropagation(); setConfirmRemove(idx); }}
                      className="absolute -top-2 -right-2 w-5 h-5 bg-black text-white text-xs flex items-center justify-center opacity-0 group-hover/card:opacity-100 transition-opacity hover:bg-red-600 z-10"
                      title="Remove day"
                      data-no-pdf
                    >
                      &times;
                    </button>
                  )}

                  {/* Top row: day + date + weather */}
                  <div className="flex items-start justify-between mb-2 pr-6">
                    <div className="flex items-baseline gap-2">
                      <span className="text-lg font-black leading-none">
                        DAY {day.dayNumber}
                      </span>
                      <span className="text-[9px] font-bold uppercase tracking-widest text-neutral-400">
                        {dateNum} {monthStr}, {day.weekday}
                      </span>
                    </div>
                    {city && (
                      <div className="shrink-0 scale-[0.6] origin-top-right -mt-1 -mr-2">
                        <WeatherWidget
                          lat={city.lat}
                          lng={city.lng}
                          date={day.date}
                        />
                      </div>
                    )}
                  </div>

                  {/* Route */}
                  {day.route && (
                    <p className="text-[9px] font-bold uppercase tracking-widest text-accent-blue mb-2 leading-tight">
                      {day.route}
                    </p>
                  )}

                  {/* Events list */}
                  <div className="space-y-0.5">
                    {day.events.map((ev, ei) => (
                      <div key={ei} className="flex gap-2 text-[10px]">
                        <span className="font-bold text-neutral-400 shrink-0 w-14">
                          {ev.time}
                        </span>
                        <span
                          className={
                            ev.highlight
                              ? "font-bold text-black"
                              : "text-neutral-600"
                          }
                        >
                          {ev.title}
                        </span>
                      </div>
                    ))}
                    {day.events.length === 0 && (
                      <span className="text-[10px] text-neutral-300 italic">No events yet</span>
                    )}
                  </div>

                  {/* Accommodation */}
                  {day.accommodation && (
                    <p className="text-[9px] text-neutral-300 uppercase tracking-widest mt-2 pt-2 border-t border-neutral-100">
                      {day.accommodation}
                    </p>
                  )}

                  {/* Drag hint */}
                  <div className="absolute bottom-1 left-1/2 -translate-x-1/2 text-[8px] text-neutral-200 select-none" data-no-pdf>
                    &equiv;&equiv;
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
