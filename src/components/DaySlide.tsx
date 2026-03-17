"use client";

import { useState } from "react";
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
  onMoveDay: (fromIndex: number, toIndex: number) => void;
  onRemoveDay: (dayIndex: number) => void;
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
  onMoveDay,
  onRemoveDay,
}: DaySlideProps) {
  const [confirmingRemove, setConfirmingRemove] = useState(false);
  const dateObj = new Date(day.date + "T00:00:00");
  const dateNum = dateObj.getDate();
  const monthStr = dateObj.toLocaleString("en-GB", { month: "short" }).toUpperCase();

  return (
    <section className={`group/day relative w-full px-12 py-10 border-b border-neutral-200 overflow-hidden ${dayIndex < totalDays - 1 ? "snap-start" : ""}`} style={{ height: "var(--slide-h)" }}>
      {/* Top row: Weather (left) + Day header (right) */}
      <div className="flex justify-between items-start mb-8">
        {/* Weather widget — top left */}
        <WeatherWidget lat={city.lat} lng={city.lng} date={day.date} />

        {/* Day header — top right */}
        <div className="text-right">
          <h2 className="text-7xl font-black uppercase tracking-tighter leading-none">
            DAY {day.dayNumber}
          </h2>
          <p className="retro-label inline-block mt-2">
            {dateNum} {monthStr}, {day.weekday.toUpperCase()}
          </p>
          <div className="mt-2">
            <EditableText
              value={day.route}
              onChange={(v) => onUpdateDayField(dayIndex, "route", v)}
              className="font-bold text-base uppercase tracking-wide text-accent-blue"
            />
          </div>
        </div>
      </div>

      {/* Main content: Gallery (left ~60%) + Schedule (right ~40%) */}
      <div className="flex gap-10">
        {/* Image gallery */}
        <div className="w-[58%] shrink-0">
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
          />
        </div>

        {/* Schedule */}
        <div className="flex-1">
          <Schedule
            events={day.events}
            onUpdateEvent={(i, ev) => onUpdateEvent(dayIndex, i, ev)}
            onAddEvent={() =>
              onAddEvent(dayIndex, {
                time: "",
                title: "New event",
                type: "activity",
              })
            }
            onRemoveEvent={(i) => onRemoveEvent(dayIndex, i)}
            onReorderEvents={(from, to) => onReorderEvents(dayIndex, from, to)}
          />
        </div>
      </div>

      {/* Accommodation footer */}
      <div className="mt-8 text-xs uppercase tracking-widest text-neutral-400">
        <EditableText
          value={day.accommodation}
          onChange={(v) => onUpdateDayField(dayIndex, "accommodation", v)}
        />
        <span className="mx-2">/</span>
        {city.name}, {city.country}
      </div>

      {/* Bottom-right hover controls */}
      <div className="absolute bottom-6 right-6 z-20 flex gap-2 opacity-0 group-hover/day:opacity-100 transition-opacity">
        {!confirmingRemove ? (
          <>
            {dayIndex > 0 && (
              <button
                onClick={() => onMoveDay(dayIndex, dayIndex - 1)}
                className="bg-black text-white text-[10px] font-bold uppercase tracking-widest px-3 py-1.5 hover:bg-neutral-800"
              >
                Move Up
              </button>
            )}
            {dayIndex < totalDays - 1 && (
              <button
                onClick={() => onMoveDay(dayIndex, dayIndex + 1)}
                className="bg-black text-white text-[10px] font-bold uppercase tracking-widest px-3 py-1.5 hover:bg-neutral-800"
              >
                Move Down
              </button>
            )}
            <button
              onClick={() => setConfirmingRemove(true)}
              className="bg-black text-white text-[10px] font-bold uppercase tracking-widest px-3 py-1.5 hover:bg-red-700"
            >
              Remove
            </button>
          </>
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
    </section>
  );
}
