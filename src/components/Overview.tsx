"use client";

import { useState } from "react";
import type { ItineraryData } from "@/types/itinerary";
import WeatherWidget from "./WeatherWidget";
import { exportOverviewToPdf } from "@/lib/exportPdf";

interface OverviewProps {
  data: ItineraryData;
  onClose: () => void;
}

export default function Overview({ data, onClose }: OverviewProps) {
  // Group days by city in visit order
  const cityGroups: { cityId: string; days: typeof data.days }[] = [];
  let lastCityId: string | null = null;

  data.days.forEach((day) => {
    if (day.cityId !== lastCityId) {
      cityGroups.push({ cityId: day.cityId, days: [day] });
      lastCityId = day.cityId;
    } else {
      cityGroups[cityGroups.length - 1].days.push(day);
    }
  });

  const [downloading, setDownloading] = useState(false);
  const handleDownloadPDF = async () => {
    setDownloading(true);
    await exportOverviewToPdf("[data-overview-content]", "trip-overview.pdf");
    setDownloading(false);
  };

  return (
    <div className="fixed inset-0 z-[60] bg-white overflow-y-auto print:static print:overflow-visible">
      {/* Header */}
      <div
        className="sticky top-0 z-10 bg-white border-b-2 border-black flex items-center justify-between px-6 print:hidden"
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

      {/* Content — captured for PDF */}
      <div data-overview-content>
        <div className="px-8 pt-8 pb-4">
          <h2 className="text-4xl font-black uppercase tracking-tight">
            {data.tripTitle.join(" ")}
          </h2>
          <p className="text-xs text-neutral-400 uppercase tracking-widest mt-2">
            {data.days.length} days &middot;{" "}
            {Object.keys(data.cities).length} cities &middot;{" "}
            {data.days[0]?.date} → {data.days[data.days.length - 1]?.date}
          </p>
        </div>

        {/* City groups */}
        <div className="px-8 pb-16">
        {cityGroups.map((group, gi) => {
          const city = data.cities[group.cityId];
          if (!city) return null;

          return (
            <div key={`${group.cityId}-${gi}`} className="mb-10">
              {/* City header */}
              <div className="flex items-baseline gap-3 mb-4 border-b border-black pb-2">
                <h3 className="text-2xl font-black uppercase tracking-tight">
                  {city.name}
                </h3>
                <span className="retro-label">{city.country}</span>
                <span className="text-[9px] text-neutral-400 uppercase tracking-widest ml-auto">
                  {group.days.length}{" "}
                  {group.days.length === 1 ? "day" : "days"}
                </span>
              </div>

              {/* Day cards — horizontal scroll if many */}
              <div className="flex gap-4 overflow-x-auto pb-2">
                {group.days.map((day) => {
                  const dateObj = new Date(day.date + "T00:00:00");
                  const dateNum = dateObj.getDate();
                  const monthStr = dateObj
                    .toLocaleString("en-GB", { month: "short" })
                    .toUpperCase();

                  return (
                    <div
                      key={day.dayNumber}
                      className="border-2 border-black p-4 hover:bg-neutral-50 transition-colors shrink-0 w-72 print:w-auto print:shrink"
                    >
                      {/* Day header */}
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <span className="text-2xl font-black">
                            DAY {day.dayNumber}
                          </span>
                          <p className="retro-label inline-block ml-2 text-[9px]">
                            {dateNum} {monthStr}
                          </p>
                        </div>
                      </div>

                      {/* Mini weather */}
                      <div className="mb-3 scale-75 origin-top-left">
                        <WeatherWidget
                          lat={city.lat}
                          lng={city.lng}
                          date={day.date}
                        />
                      </div>

                      {/* Route */}
                      {day.route && (
                        <p className="text-[9px] font-bold uppercase tracking-widest text-neutral-400 mb-2">
                          {day.route}
                        </p>
                      )}

                      {/* Events list */}
                      <div className="space-y-1">
                        {day.events.map((ev, ei) => (
                          <div key={ei} className="flex gap-2 text-[10px]">
                            <span className="font-bold text-neutral-500 shrink-0 w-14">
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
                      </div>

                      {/* Accommodation */}
                      {day.accommodation && (
                        <p className="text-[9px] text-neutral-300 uppercase tracking-widest mt-3 pt-2 border-t border-neutral-100">
                          {day.accommodation}
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
        </div>
      </div>
    </div>
  );
}
