"use client";

import { useRef, useState } from "react";
import type { ScheduleEvent, Comment } from "@/types/itinerary";
import EditableText from "./EditableText";
import ColorPicker from "./ColorPicker";
import CommentBubble from "./CommentBubble";

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
  dayIndex?: number;
  comments?: Comment[];
  onAddComment?: (comment: Comment) => void;
  onUpdateComment?: (commentId: string, text: string) => void;
  onRemoveComment?: (commentId: string) => void;
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
  dayIndex,
  comments = [],
  onAddComment,
  onUpdateComment,
  onRemoveComment,
}: ScheduleProps) {
  const dragItem = useRef<number | null>(null);
  const dragOverItem = useRef<number | null>(null);
  const [colorPickerIdx, setColorPickerIdx] = useState<number | null>(null);

  const handleDragStart = (index: number) => { dragItem.current = index; };
  const handleDragEnter = (index: number) => { dragOverItem.current = index; };
  const handleDragEnd = () => {
    if (dragItem.current !== null && dragOverItem.current !== null && dragItem.current !== dragOverItem.current) {
      onReorderEvents(dragItem.current, dragOverItem.current);
    }
    dragItem.current = null;
    dragOverItem.current = null;
  };

  // Parse events into segments: normal, split/merge pairs
  // A "split" type event starts a split section, the next "split" type merges it back
  type Segment =
    | { kind: "normal"; events: { event: ScheduleEvent; globalIdx: number }[] }
    | { kind: "split"; splitIdx: number; mergeIdx: number; hasExplicitMerge: boolean; groupA: { event: ScheduleEvent; globalIdx: number }[]; groupB: { event: ScheduleEvent; globalIdx: number }[] };

  const segments: Segment[] = [];
  let i = 0;
  while (i < events.length) {
    if (events[i].type === "split") {
      const splitIdx = i;
      // Find matching merge (next split-type event)
      let mergeIdx = -1;
      for (let j = i + 1; j < events.length; j++) {
        if (events[j].type === "split") { mergeIdx = j; break; }
      }
      const hasExplicitMerge = mergeIdx >= 0;
      const end = hasExplicitMerge ? mergeIdx : events.length;
      const groupA: { event: ScheduleEvent; globalIdx: number }[] = [];
      const groupB: { event: ScheduleEvent; globalIdx: number }[] = [];
      for (let j = splitIdx + 1; j < end; j++) {
        if (events[j].group === "B") {
          groupB.push({ event: events[j], globalIdx: j });
        } else {
          groupA.push({ event: events[j], globalIdx: j });
        }
      }
      segments.push({ kind: "split", splitIdx, mergeIdx, hasExplicitMerge, groupA, groupB });
      i = hasExplicitMerge ? mergeIdx + 1 : events.length;
    } else {
      // Collect consecutive normal events
      const normalEvents: { event: ScheduleEvent; globalIdx: number }[] = [];
      while (i < events.length && events[i].type !== "split") {
        normalEvents.push({ event: events[i], globalIdx: i });
        i++;
      }
      segments.push({ kind: "normal", events: normalEvents });
    }
  }

  // Legacy compat: detect if any split exists (for bottom button)
  const hasSplit = segments.some((s) => s.kind === "split");
  // Check if the last segment is a split without merge (open-ended)
  const lastSegment = segments[segments.length - 1];
  const hasOpenSplit = lastSegment?.kind === "split" && !lastSegment.hasExplicitMerge;

  const renderFullEvent = (event: ScheduleEvent, globalIndex: number) => {
    const colorClass = TYPE_COLORS[event.type] || "";
    const isTransport = event.type === "transport";
    const textStyle = event.textColor ? { color: event.textColor } : undefined;
    const bgStyle = event.highlightColor ? { backgroundColor: event.highlightColor } : undefined;
    const highlightClass = !event.highlightColor && event.highlight ? "event-highlight" : "";
    const appliedColorClass = event.textColor ? "" : (isTransport ? colorClass : "");

    if (locked) {
      return (
        <div key={globalIndex} className={`flex items-start gap-4 py-2 ${highlightClass}`} style={{ ...bgStyle, borderRadius: bgStyle ? "4px" : undefined, padding: bgStyle ? "4px 8px" : undefined }}>
          <div className={`font-bold text-base tabular-nums shrink-0 w-24 text-right ${appliedColorClass}`} style={textStyle}>
            {event.time}
          </div>
          <div className={`flex-1 text-base text-right ${appliedColorClass}`} style={textStyle}>
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
        className={`group/evt flex items-start gap-4 py-2 relative ${highlightClass}`}
        style={{ ...bgStyle, borderRadius: bgStyle ? "4px" : undefined, padding: bgStyle ? "4px 8px" : undefined }}
      >
        {/* Left-side controls: drag, color, comment */}
        <div className="opacity-0 group-hover/evt:opacity-100 transition-opacity shrink-0 flex items-center gap-1 mt-1">
          <span className="opacity-30 cursor-grab text-sm select-none">&#x2801;&#x2801;</span>
          <button
            onClick={() => setColorPickerIdx(colorPickerIdx === globalIndex ? null : globalIndex)}
            className="opacity-30 hover:!opacity-100 text-[11px]"
            title="Change colors"
          >
            🎨
          </button>
          {onAddComment && onUpdateComment && onRemoveComment && dayIndex !== undefined && (
            <span className="opacity-40 hover:!opacity-100">
              <CommentBubble
                comments={comments}
                targetType="event"
                targetDayIndex={dayIndex}
                targetEventIndex={globalIndex}
                onAdd={onAddComment}
                onUpdate={onUpdateComment}
                onRemove={onRemoveComment}
                locked={locked}
                position="left"
              />
            </span>
          )}
        </div>
        <div className={`font-bold text-base tabular-nums shrink-0 w-24 text-right ${appliedColorClass}`} style={textStyle}>
          <EditableText value={event.time} onChange={(v) => onUpdateEvent(globalIndex, { time: v })} className={appliedColorClass} placeholder="--:--" />
        </div>
        <div className={`flex-1 text-base text-right ${appliedColorClass}`} style={textStyle}>
          <EditableText value={event.title} onChange={(v) => onUpdateEvent(globalIndex, { title: v })} className={appliedColorClass} placeholder="Event name" />
        </div>
        {/* Delete on right */}
        <button onClick={() => onRemoveEvent(globalIndex)} className="opacity-0 group-hover/evt:opacity-40 hover:!opacity-100 text-sm text-red-500 shrink-0 mt-0.5">&times;</button>
        {colorPickerIdx === globalIndex && (
          <ColorPicker
            textColor={event.textColor}
            highlightColor={event.highlightColor}
            onChangeTextColor={(c) => onUpdateEvent(globalIndex, { textColor: c })}
            onChangeHighlightColor={(c) => onUpdateEvent(globalIndex, { highlightColor: c })}
            onClose={() => setColorPickerIdx(null)}
          />
        )}
      </div>
    );
  };

  const renderCompactEvent = (event: ScheduleEvent, globalIndex: number) => {
    const colorClass = TYPE_COLORS[event.type] || "";
    const isTransport = event.type === "transport";
    const textStyle = event.textColor ? { color: event.textColor } : undefined;
    const bgStyle = event.highlightColor ? { backgroundColor: event.highlightColor } : undefined;
    const highlightClass = !event.highlightColor && event.highlight ? "event-highlight" : "";
    const appliedColorClass = event.textColor ? "" : (isTransport ? colorClass : "");

    if (locked) {
      return (
        <div key={globalIndex} className={`flex items-start gap-3 py-2 ${highlightClass}`} style={{ ...bgStyle, borderRadius: bgStyle ? "4px" : undefined, padding: bgStyle ? "4px 6px" : undefined }}>
          <div className={`font-bold text-sm tabular-nums shrink-0 w-[4.5rem] text-right ${appliedColorClass}`} style={textStyle}>
            {event.time || "--:--"}
          </div>
          <div className={`flex-1 text-sm text-right ${appliedColorClass}`} style={textStyle}>
            {event.title}
          </div>
        </div>
      );
    }

    return (
      <div key={globalIndex} className={`group/evt flex items-start gap-3 py-2 relative ${highlightClass}`} style={{ ...bgStyle, borderRadius: bgStyle ? "4px" : undefined, padding: bgStyle ? "4px 6px" : undefined }}>
        {/* Left-side controls: color only */}
        <div className="opacity-0 group-hover/evt:opacity-100 transition-opacity shrink-0 flex items-center gap-0.5">
          <button
            onClick={() => setColorPickerIdx(colorPickerIdx === globalIndex ? null : globalIndex)}
            className="opacity-30 hover:!opacity-100 text-[10px]"
            title="Change colors"
          >
            🎨
          </button>
        </div>
        <div className={`font-bold text-sm tabular-nums shrink-0 w-[4.5rem] text-right ${appliedColorClass}`} style={textStyle}>
          <EditableText value={event.time} onChange={(v) => onUpdateEvent(globalIndex, { time: v })} className={appliedColorClass} placeholder="--:--" />
        </div>
        <div className={`flex-1 text-sm text-right ${appliedColorClass}`} style={textStyle}>
          <EditableText value={event.title} onChange={(v) => onUpdateEvent(globalIndex, { title: v })} className={appliedColorClass} />
        </div>
        {/* Delete on right */}
        <button onClick={() => onRemoveEvent(globalIndex)} className="opacity-0 group-hover/evt:opacity-40 hover:!opacity-100 text-sm text-red-500 shrink-0">&times;</button>
        {colorPickerIdx === globalIndex && (
          <ColorPicker
            textColor={event.textColor}
            highlightColor={event.highlightColor}
            onChangeTextColor={(c) => onUpdateEvent(globalIndex, { textColor: c })}
            onChangeHighlightColor={(c) => onUpdateEvent(globalIndex, { highlightColor: c })}
            onClose={() => setColorPickerIdx(null)}
          />
        )}
      </div>
    );
  };

  return (
    <div>
      {segments.map((seg, sIdx) => {
        if (seg.kind === "normal") {
          return (
            <div key={`seg-${sIdx}`} className="space-y-0.5">
              {seg.events.map(({ event, globalIdx }) => renderFullEvent(event, globalIdx))}
            </div>
          );
        }

        // Split segment
        return (
          <div key={`seg-${sIdx}`}>
            {/* Split divider */}
            <div className="flex items-center gap-3 my-5">
              <div className="flex-1 h-px bg-neutral-200" />
              <span className="text-[9px] font-bold uppercase tracking-widest text-neutral-300">Split</span>
              {!locked && <button onClick={() => onRemoveEvent(seg.splitIdx)} className="text-[10px] font-bold border border-neutral-300 hover:border-red-400 text-neutral-400 hover:text-red-500 w-5 h-5 flex items-center justify-center transition-colors" title="Remove split">&times;</button>}
              <div className="flex-1 h-px bg-neutral-200" />
            </div>

            {/* Two-column split area */}
            <div className="flex gap-4 mb-3">
              <div className="flex-1 min-w-0 border-l-2 border-neutral-200 pl-3">
                <span className="text-[9px] font-bold uppercase tracking-widest text-neutral-300 block mb-2">Group A</span>
                {seg.groupA.map(({ event, globalIdx }) => renderCompactEvent(event, globalIdx))}
                {!locked && (
                  <button onClick={() => onAddEvent("A")} className="text-xs text-neutral-300 hover:text-neutral-500 mt-3 ml-auto flex items-center gap-1 font-bold uppercase tracking-wider">
                    <span className="text-sm leading-none">+</span> Add
                  </button>
                )}
              </div>
              <div className="flex-1 min-w-0 border-l-2 border-neutral-400 pl-3">
                <span className="text-[9px] font-bold uppercase tracking-widest text-neutral-400 block mb-2">Group B</span>
                {seg.groupB.map(({ event, globalIdx }) => renderCompactEvent(event, globalIdx))}
                {!locked && (
                  <button onClick={() => onAddEvent("B")} className="text-xs text-neutral-300 hover:text-neutral-500 mt-3 ml-auto flex items-center gap-1 font-bold uppercase tracking-wider">
                    <span className="text-sm leading-none">+</span> Add
                  </button>
                )}
              </div>
            </div>

            {/* Merge divider */}
            {seg.hasExplicitMerge ? (
              <div className="flex items-center gap-3 my-5">
                <div className="flex-1 h-px bg-neutral-200" />
                <span className="text-[9px] font-bold uppercase tracking-widest text-neutral-300">Merge</span>
                {!locked && <button onClick={() => onRemoveEvent(seg.mergeIdx)} className="text-[10px] font-bold border border-neutral-300 hover:border-red-400 text-neutral-400 hover:text-red-500 w-5 h-5 flex items-center justify-center transition-colors" title="Remove merge">&times;</button>}
                <div className="flex-1 h-px bg-neutral-200" />
              </div>
            ) : !locked ? (
              <button onClick={onAddMergeEvent} className="flex items-center gap-2 text-[10px] text-neutral-300 hover:text-neutral-500 my-3 w-full">
                <div className="flex-1 h-px bg-neutral-100" />
                <span className="uppercase tracking-widest font-bold">+ Merge back</span>
                <div className="flex-1 h-px bg-neutral-100" />
              </button>
            ) : null}
          </div>
        );
      })}

      {/* Bottom buttons — hidden when locked */}
      {!locked && (
        <div className="flex items-center gap-6 mt-6">
          <button
            onClick={() => onAddEvent()}
            className="text-sm text-neutral-400 hover:text-neutral-600 flex items-center gap-2 font-bold uppercase tracking-wider"
          >
            <span className="text-base leading-none">+</span> Add event
          </button>
          {!hasOpenSplit && onAddSplitEvent && (
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
