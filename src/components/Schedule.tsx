"use client";

import { useRef } from "react";
import type { ScheduleEvent } from "@/types/itinerary";
import EditableText from "./EditableText";

const TYPE_COLORS: Record<ScheduleEvent["type"], string> = {
  transport: "text-[#C80815]",
  food: "text-accent-gold",
  activity: "text-[#2D2D2D]",
  accommodation: "text-accent-purple",
  rest: "text-neutral-400",
  split: "text-neutral-300",
};

interface ScheduleProps {
  events: ScheduleEvent[];
  onUpdateEvent: (index: number, event: Partial<ScheduleEvent>) => void;
  onAddEvent: (group?: "A" | "B") => void;
  onRemoveEvent: (index: number) => void;
  onReorderEvents: (fromIndex: number, toIndex: number) => void;
  onAddSplitEvent?: () => void;
  onAddMergeEvent?: () => void;
  locked?: boolean;
}

export default function Schedule({
  events,
  onUpdateEvent,
  onAddEvent,
  onRemoveEvent,
  onReorderEvents,
  onAddSplitEvent,
  onAddMergeEvent,
  locked,
}: ScheduleProps) {
  const dragItem = useRef<number | null>(null);
  const dragOverItem = useRef<number | null>(null);

  const handleDragStart = (index: number) => { dragItem.current = index; };
  const handleDragEnter = (index: number) => { dragOverItem.current = index; };
  const handleDragEnd = () => {
    if (dragItem.current !== null && dragOverItem.current !== null && dragItem.current !== dragOverItem.current) {
      onReorderEvents(dragItem.current, dragOverItem.current);
    }
    dragItem.current = null;
    dragOverItem.current = null;
  };

  // Find split and merge indices
  const splitIndex = events.findIndex((e) => e.type === "split");
  const hasSplit = splitIndex >= 0;
  // Find merge point (next split-type event after splitIndex, or use a "merge" marker)
  // For now, look for a second "split" event that acts as merge
  const mergeIndex = hasSplit ? events.findIndex((e, i) => i > splitIndex && e.type === "split") : -1;
  const hasMerge = mergeIndex >= 0;

  // Segment events
  const beforeSplit = hasSplit ? events.slice(0, splitIndex) : events;
  const splitEvents = hasSplit
    ? events.slice(splitIndex + 1, hasMerge ? mergeIndex : events.length)
    : [];
  const afterMerge = hasMerge ? events.slice(mergeIndex + 1) : [];

  // Split events into groups
  const groupAEvents: { event: ScheduleEvent; globalIdx: number }[] = [];
  const groupBEvents: { event: ScheduleEvent; globalIdx: number }[] = [];
  splitEvents.forEach((ev, i) => {
    const gIdx = splitIndex + 1 + i;
    if (ev.group === "B") {
      groupBEvents.push({ event: ev, globalIdx: gIdx });
    } else {
      groupAEvents.push({ event: ev, globalIdx: gIdx });
    }
  });

  const renderFullEvent = (event: ScheduleEvent, globalIndex: number) => {
    const colorClass = TYPE_COLORS[event.type] || "";
    const isTransport = event.type === "transport";

    if (locked) {
      return (
        <div key={globalIndex} className={`flex items-start gap-4 py-2 ${event.highlight ? "event-highlight" : ""}`}>
          <div className={`font-bold text-base tabular-nums shrink-0 w-24 text-right ${isTransport ? colorClass : ""}`}>
            {event.time}
          </div>
          <div className={`flex-1 text-base text-right ${isTransport ? colorClass : ""}`}>
            {event.title}
          </div>
        </div>
      );
    }

    return (
      <div
        key={globalIndex}
        draggable
        onDragStart={() => handleDragStart(globalIndex)}
        onDragEnter={() => handleDragEnter(globalIndex)}
        onDragEnd={handleDragEnd}
        onDragOver={(e) => e.preventDefault()}
        className={`group/evt flex items-start gap-4 py-2 ${event.highlight ? "event-highlight" : ""}`}
      >
        <span className="opacity-0 group-hover/evt:opacity-30 cursor-grab text-sm mt-1 select-none shrink-0">
          &#x2801;&#x2801;
        </span>
        <div className={`font-bold text-base tabular-nums shrink-0 w-24 text-right ${isTransport ? colorClass : ""}`}>
          <EditableText value={event.time} onChange={(v) => onUpdateEvent(globalIndex, { time: v })} className={isTransport ? colorClass : ""} />
        </div>
        <div className={`flex-1 text-base text-right ${isTransport ? colorClass : ""}`}>
          <EditableText value={event.title} onChange={(v) => onUpdateEvent(globalIndex, { title: v })} className={isTransport ? colorClass : ""} />
        </div>
        <button onClick={() => onRemoveEvent(globalIndex)} className="opacity-0 group-hover/evt:opacity-40 hover:!opacity-100 text-sm text-red-500 shrink-0 mt-0.5">&times;</button>
      </div>
    );
  };

  const renderCompactEvent = (event: ScheduleEvent, globalIndex: number) => {
    const colorClass = TYPE_COLORS[event.type] || "";
    const isTransport = event.type === "transport";

    if (locked) {
      return (
        <div key={globalIndex} className={`flex items-start gap-3 py-2 ${event.highlight ? "event-highlight" : ""}`}>
          <div className={`font-bold text-sm tabular-nums shrink-0 w-[4.5rem] text-right ${isTransport ? colorClass : ""}`}>
            {event.time || "--:--"}
          </div>
          <div className={`flex-1 text-sm text-right ${isTransport ? colorClass : ""}`}>
            {event.title}
          </div>
        </div>
      );
    }

    return (
      <div key={globalIndex} className={`group/evt flex items-start gap-3 py-2 ${event.highlight ? "event-highlight" : ""}`}>
        <div className={`font-bold text-sm tabular-nums shrink-0 w-[4.5rem] text-right ${isTransport ? colorClass : ""}`}>
          <EditableText value={event.time} onChange={(v) => onUpdateEvent(globalIndex, { time: v })} className={isTransport ? colorClass : ""} placeholder="--:--" />
        </div>
        <div className={`flex-1 text-sm text-right ${isTransport ? colorClass : ""}`}>
          <EditableText value={event.title} onChange={(v) => onUpdateEvent(globalIndex, { title: v })} className={isTransport ? colorClass : ""} />
        </div>
        <button onClick={() => onRemoveEvent(globalIndex)} className="opacity-0 group-hover/evt:opacity-40 hover:!opacity-100 text-sm text-red-500 shrink-0">&times;</button>
      </div>
    );
  };

  return (
    <div>
      {/* Events before split */}
      <div className="space-y-0.5">
        {beforeSplit.map((event, i) => renderFullEvent(event, i))}
      </div>

      {/* Split divider */}
      {hasSplit && (
        <>
          <div className="flex items-center gap-3 my-5">
            <div className="flex-1 h-px bg-neutral-200" />
            <span className="text-[9px] font-bold uppercase tracking-widest text-neutral-300">Split</span>
            {!locked && <button onClick={() => onRemoveEvent(splitIndex)} className="text-[9px] text-neutral-200 hover:text-red-500">&times;</button>}
            <div className="flex-1 h-px bg-neutral-200" />
          </div>

          {/* Two-column split area */}
          <div className="flex gap-4 mb-3">
            {/* Group A */}
            <div className="flex-1 min-w-0 border-l-2 border-neutral-200 pl-3">
              <span className="text-[9px] font-bold uppercase tracking-widest text-neutral-300 block mb-2">Group A</span>
              {groupAEvents.map(({ event, globalIdx }) => renderCompactEvent(event, globalIdx))}
              {!locked && (
                <button
                  onClick={() => onAddEvent("A")}
                  className="text-xs text-neutral-300 hover:text-neutral-500 mt-3 ml-auto flex items-center gap-1 font-bold uppercase tracking-wider"
                >
                  <span className="text-sm leading-none">+</span> Add
                </button>
              )}
            </div>
            {/* Group B */}
            <div className="flex-1 min-w-0 border-l-2 border-neutral-400 pl-3">
              <span className="text-[9px] font-bold uppercase tracking-widest text-neutral-400 block mb-2">Group B</span>
              {groupBEvents.map(({ event, globalIdx }) => renderCompactEvent(event, globalIdx))}
              {!locked && (
                <button
                  onClick={() => onAddEvent("B")}
                  className="text-xs text-neutral-300 hover:text-neutral-500 mt-3 ml-auto flex items-center gap-1 font-bold uppercase tracking-wider"
                >
                  <span className="text-sm leading-none">+</span> Add
                </button>
              )}
            </div>
          </div>

          {/* Merge divider (if exists) */}
          {hasMerge ? (
            <div className="flex items-center gap-3 my-5">
              <div className="flex-1 h-px bg-neutral-200" />
              <span className="text-[9px] font-bold uppercase tracking-widest text-neutral-300">Merge</span>
              {!locked && <button onClick={() => onRemoveEvent(mergeIndex)} className="text-[9px] text-neutral-200 hover:text-red-500">&times;</button>}
              <div className="flex-1 h-px bg-neutral-200" />
            </div>
          ) : !locked ? (
            <button
              onClick={onAddMergeEvent}
              className="flex items-center gap-2 text-[10px] text-neutral-300 hover:text-neutral-500 my-3"
            >
              <div className="flex-1 h-px bg-neutral-100 w-8" />
              <span className="uppercase tracking-widest font-bold">+ Merge back</span>
              <div className="flex-1 h-px bg-neutral-100 w-8" />
            </button>
          ) : null}

          {/* Events after merge */}
          {hasMerge && (
            <div className="space-y-0.5">
              {afterMerge.map((event, i) => renderFullEvent(event, mergeIndex + 1 + i))}
            </div>
          )}
        </>
      )}

      {/* Bottom buttons — hidden when locked */}
      {!locked && (
        <div className="flex items-center gap-6 mt-6">
          <button
            onClick={() => onAddEvent()}
            className="text-sm text-neutral-400 hover:text-neutral-600 flex items-center gap-2 font-bold uppercase tracking-wider"
          >
            <span className="text-base leading-none">+</span> Add event
          </button>
          {!hasSplit && onAddSplitEvent && (
            <button
              onClick={onAddSplitEvent}
              className="text-sm text-neutral-300 hover:text-neutral-500 flex items-center gap-2 font-bold uppercase tracking-wider"
            >
              <span className="text-base leading-none">&#x2502;&#x2502;</span> Split
            </button>
          )}
        </div>
      )}
    </div>
  );
}
