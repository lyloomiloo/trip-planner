"use client";

import { useState, useEffect } from "react";
import type { DayData, CityData, ScheduleEvent, GallerySlot as GallerySlotType } from "@/types/itinerary";
import WeatherWidget from "./WeatherWidget";
import ImageGallery from "./ImageGallery";
import Schedule from "./Schedule";
import EditableText from "./EditableText";

interface DaySlideProps {
  day: DayData;
  city: CityData;
  dayIndex: number;
  totalDays: number;
  onUpdateEvent: (dayIndex: number, eventIndex: number, event: Partial<ScheduleEvent>) => void;
  onAddEvent: (dayIndex: number, event: ScheduleEvent) => void;
  onRemoveEvent: (dayIndex: number, eventIndex: number) => void;
  onReorderEvents: (dayIndex: number, fromIndex: number, toIndex: number) => void;
  onUpdateGallerySlot: (dayIndex: number, slotIndex: number, slot: Partial<GallerySlotType>) => void;
  onAddGallerySlot: (dayIndex: number, slot: GallerySlotType) => void;
  onRemoveGallerySlot: (dayIndex: number, slotIndex: number) => void;
  onUpdateDayField: (dayIndex: number, field: keyof DayData, value: string) => void;
  onUpdateDayDate?: (dayIndex: number, date: string) => void;
  onUpdateDayWeatherLoc?: (dayIndex: number, lat: number, lng: number) => void;
  onRemoveDay: (dayIndex: number) => void;
  locked?: boolean;
}

export default function DaySlide({
  day,
  city,
  dayIndex,
  totalDays,
  onUpdateEvent,
  onAddEvent,
  onRemoveEvent,
  onReorderEvents,
  onUpdateGallerySlot,
  onAddGallerySlot,
  onRemoveGallerySlot,
  onUpdateDayField,
  onUpdateDayDate,
  onUpdateDayWeatherLoc,
  onRemoveDay,
  locked,
}: DaySlideProps) {
  const [confirmingRemove, setConfirmingRemove] = useState(false);
  const [editingDate, setEditingDate] = useState(false);
  const [dateInputVal, setDateInputVal] = useState(day.date);

  // Keep local date input in sync with prop changes
  useEffect(() => {
    setDateInputVal(day.date);
  }, [day.date]);

  const dateObj = new Date(day.date + "T12:00:00");
  const dateNum = dateObj.getDate();
  const monthStr = dateObj.toLocaleString("en-GB", { month: "short" }).toUpperCase();

  // Use per-day weather override if set, otherwise fall back to city coords
  const weatherLat = day.weatherLat ?? city.lat;
  const weatherLng = day.weatherLng ?? city.lng;

  return (
    <section className={`group/day relative w-full px-12 pt-10 pb-14 border-b border-neutral-200 overflow-hidden flex flex-col ${dayIndex < totalDays - 1 ? "snap-start" : ""}`} style={{ height: "var(--slide-h)" }}>
      {/* Top row: Weather (left) + Day header (right) */}
      <div className="flex justify-between items-start mb-2">
        {/* Weather widget — top left */}
        <WeatherWidget
          lat={weatherLat}
          lng={weatherLng}
          date={day.date}
          cityName={city.name}
          onUpdateLocation={onUpdateDayWeatherLoc ? (lat, lng) => onUpdateDayWeatherLoc(dayIndex, lat, lng) : undefined}
          locked={locked}
        />

        {/* Day header — top right */}
        <div className="text-right">
          <h2 className="text-7xl font-black uppercase tracking-tighter leading-none">
            DAY {day.dayNumber}
          </h2>
          {/* Date display / editable */}
          {!editingDate || locked ? (
            <p
              className={`retro-label inline-block mt-2 ${!locked ? "cursor-pointer hover:bg-neutral-200" : ""} transition-colors`}
              onClick={() => !locked && onUpdateDayDate && setEditingDate(true)}
              title={!locked ? "Click to change date" : undefined}
            >
              {dateNum} {monthStr}, {day.weekday.toUpperCase()}
            </p>
          ) : (
            <div className="inline-flex items-center gap-2 mt-2">
              <input
                type="date"
                value={dateInputVal}
                autoFocus
                onChange={(e) => {
                  const val = e.target.value;
                  if (val && /^\d{4}-\d{2}-\d{2}$/.test(val)) {
                    setDateInputVal(val);
                    if (onUpdateDayDate) {
                      onUpdateDayDate(dayIndex, val);
                    }
                  }
                }}
                onBlur={() => setTimeout(() => setEditingDate(false), 300)}
                className="text-xs border border-black px-2 py-1 focus:outline-none"
              />
              <button
                onClick={() => setEditingDate(false)}
                className="text-[10px] font-bold uppercase tracking-widest text-neutral-400 hover:text-black"
              >
                Done
              </button>
            </div>
          )}
          <div className="mt-2">
            {locked ? (
              <span className="font-bold text-base uppercase tracking-wide text-accent-blue">{day.route}</span>
            ) : (
              <EditableText
                value={day.route}
                onChange={(v) => onUpdateDayField(dayIndex, "route", v)}
                className="font-bold text-base uppercase tracking-wide text-accent-blue"
                placeholder="(HIGHLIGHT)"
              />
            )}
          </div>
        </div>
      </div>

      {/* Main content: Gallery (left ~60%) + Schedule (right ~40%) */}
      <div className="flex gap-10 flex-1 min-h-0">
        {/* Image gallery */}
        <div className="w-[58%] shrink-0 overflow-hidden">
          <ImageGallery
            gallery={day.gallery}
            onUpdateSlot={(i, slot) => onUpdateGallerySlot(dayIndex, i, slot)}
            onAddSlot={() =>
              onAddGallerySlot(dayIndex, {
                url: null,
                caption: null,
                size: "medium",
                slot: String.fromCharCode(65 + day.gallery.length),
              })
            }
            onRemoveSlot={(i) => onRemoveGallerySlot(dayIndex, i)}
            autoSearchTerms={[
              city.name,
              ...day.events
                .filter((e) => e.type !== "split" && e.title && e.highlight)
                .map((e) => `${e.title} ${city.name}`),
              ...day.events
                .filter((e) => e.type !== "split" && e.title && !e.highlight)
                .slice(0, 3)
                .map((e) => `${e.title} ${city.name}`),
            ]}
            locked={locked}
            dayNumber={day.dayNumber}
          />
        </div>

        {/* Schedule */}
        <div className="flex-1">
          <Schedule
            events={day.events}
            onUpdateEvent={(i, ev) => onUpdateEvent(dayIndex, i, ev)}
            onAddEvent={(group) =>
              onAddEvent(dayIndex, {
                time: "",
                title: "New event",
                type: "activity",
                ...(group ? { group } : {}),
              })
            }
            onRemoveEvent={(i) => onRemoveEvent(dayIndex, i)}
            onReorderEvents={(from, to) => onReorderEvents(dayIndex, from, to)}
            onAddSplitEvent={() =>
              onAddEvent(dayIndex, {
                time: "",
                title: "",
                type: "split",
              })
            }
            onAddMergeEvent={() =>
              onAddEvent(dayIndex, {
                time: "",
                title: "",
                type: "split",
              })
            }
            locked={locked}
          />
        </div>
      </div>

      {/* Accommodation footer — pinned to bottom */}
      <div className="absolute bottom-4 left-12 right-12 group/accom text-sm uppercase tracking-widest text-neutral-400 flex items-center">
        {locked ? (
          <span>{day.accommodation || "—"}</span>
        ) : (
          <EditableText
            value={day.accommodation}
            onChange={(v) => onUpdateDayField(dayIndex, "accommodation", v)}
            placeholder="(hotel name here)"
          />
        )}
        <span className="mx-2">/</span>
        <span>{city.name}, {city.country}</span>
      </div>

      {/* Bottom-right hover controls — hidden when locked */}
      {!locked && (
        <div className="absolute bottom-6 right-6 z-20 flex gap-2 opacity-0 group-hover/day:opacity-100 transition-opacity">
          {!confirmingRemove ? (
            <button
              onClick={() => setConfirmingRemove(true)}
              className="bg-black text-white text-[10px] font-bold uppercase tracking-widest px-3 py-1.5 hover:bg-red-700"
            >
              Remove
            </button>
          ) : (
            <div className="flex items-center gap-3 bg-white border-2 border-black px-4 py-2">
              <span className="text-[10px] font-bold uppercase tracking-widest">
                Remove Day {day.dayNumber}?
              </span>
              <button
                onClick={() => { onRemoveDay(dayIndex); setConfirmingRemove(false); }}
                className="bg-black text-white text-[10px] font-bold uppercase tracking-widest px-3 py-1 hover:bg-red-700"
              >
                Yes
              </button>
              <button
                onClick={() => setConfirmingRemove(false)}
                className="text-[10px] font-bold uppercase tracking-widest text-neutral-400 hover:text-black"
              >
                Cancel
              </button>
            </div>
          )}
        </div>
      )}
    </section>
  );
}
