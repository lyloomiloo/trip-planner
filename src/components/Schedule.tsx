"use client";

import { useRef } from "react";
import type { ScheduleEvent } from "@/types/itinerary";
import EditableText from "./EditableText";

// Color map for event types
const TYPE_COLORS: Record<ScheduleEvent["type"], string> = {
  transport: "text-[#D946A8]",   // magenta for transport (matches reference)
  food: "text-accent-gold",
  activity: "text-[#2D2D2D]",
  accommodation: "text-accent-purple",
  rest: "text-neutral-400",
};

interface ScheduleProps {
  events: ScheduleEvent[];
  onUpdateEvent: (index: number, event: Partial<ScheduleEvent>) => void;
  onAddEvent: () => void;
  onRemoveEvent: (index: number) => void;
  onReorderEvents: (fromIndex: number, toIndex: number) => void;
}

export default function Schedule({
  events,
  onUpdateEvent,
  onAddEvent,
  onRemoveEvent,
  onReorderEvents,
}: ScheduleProps) {
  const dragItem = useRef<number | null>(null);
  const dragOverItem = useRef<number | null>(null);

  const handleDragStart = (index: number) => {
    dragItem.current = index;
  };

  const handleDragEnter = (index: number) => {
    dragOverItem.current = index;
  };

  const handleDragEnd = () => {
    if (dragItem.current !== null && dragOverItem.current !== null && dragItem.current !== dragOverItem.current) {
      onReorderEvents(dragItem.current, dragOverItem.current);
    }
    dragItem.current = null;
    dragOverItem.current = null;
  };

  return (
    <div className="space-y-1">
      {events.map((event, i) => {
        const colorClass = TYPE_COLORS[event.type];
        const isTransport = event.type === "transport";

        return (
          <div
            key={i}
            draggable
            onDragStart={() => handleDragStart(i)}
            onDragEnter={() => handleDragEnter(i)}
            onDragEnd={handleDragEnd}
            onDragOver={(e) => e.preventDefault()}
            className={`group flex items-start gap-6 py-1.5 ${
              event.highlight ? "event-highlight" : ""
            }`}
          >
            {/* Drag handle */}
            <span className="opacity-0 group-hover:opacity-30 cursor-grab text-xs mt-1 select-none shrink-0">
              ⠿
            </span>

            {/* Time — bold, left side */}
            <div className={`font-bold text-sm tabular-nums shrink-0 w-20 text-right ${isTransport ? colorClass : ""}`}>
              <EditableText
                value={event.time}
                onChange={(v) => onUpdateEvent(i, { time: v })}
                className={isTransport ? colorClass : ""}
              />
            </div>

            {/* Title — right-aligned */}
            <div className={`flex-1 text-sm text-right ${isTransport ? colorClass : ""}`}>
              <EditableText
                value={event.title}
                onChange={(v) => onUpdateEvent(i, { title: v })}
                className={isTransport ? colorClass : ""}
              />
            </div>

            {/* Remove button */}
            <button
              onClick={() => onRemoveEvent(i)}
              className="opacity-0 group-hover:opacity-40 hover:!opacity-100 text-xs text-red-500 shrink-0 mt-0.5"
              title="Remove event"
            >
              ✕
            </button>
          </div>
        );
      })}

      {/* Add event button */}
      <button
        onClick={onAddEvent}
        className="text-xs text-neutral-400 hover:text-neutral-600 mt-3 flex items-center gap-1"
      >
        <span className="text-lg leading-none">+</span> Add event
      </button>
    </div>
  );
}
