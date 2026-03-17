"use client";

import type { GallerySlot as GallerySlotType } from "@/types/itinerary";
import EditableText from "./EditableText";

interface GallerySlotProps {
  slot: GallerySlotType;
  onClickEmpty?: () => void;
  onClickSearch?: () => void;
  onClickPasteUrl?: () => void;
  onRemove?: () => void;
  onUpdateCaption?: (caption: string) => void;
  onResize?: (size: "small" | "medium" | "large") => void;
}

export default function GallerySlot({
  slot,
  onClickEmpty,
  onClickSearch,
  onClickPasteUrl,
  onRemove,
  onUpdateCaption,
  onResize,
}: GallerySlotProps) {
  const isLocked = !onClickEmpty && !onClickSearch;

  if (!slot.url) {
    // Empty slot — should not render in locked mode (filtered upstream)
    return (
      <div className="relative group h-full">
        <div
          onClick={onClickEmpty}
          className="gallery-slot-empty w-full h-full flex-col gap-2 cursor-pointer"
        >
          <span className="text-3xl text-neutral-300 font-light leading-none">+</span>
          <span className="text-[10px] uppercase tracking-widest text-neutral-400">
            Click to search images
          </span>
        </div>

        {/* Size toggle on hover */}
        {onResize && (
          <div className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 flex gap-0.5">
            {(["S", "M", "L"] as const).map((label) => {
              const size = label === "S" ? "small" : label === "M" ? "medium" : "large";
              return (
                <button
                  key={label}
                  onClick={(e) => { e.stopPropagation(); onResize(size); }}
                  className={`w-5 h-5 text-[9px] font-bold border ${
                    slot.size === size
                      ? "bg-black text-white border-black"
                      : "bg-white text-neutral-500 border-neutral-300 hover:border-black"
                  }`}
                >
                  {label}
                </button>
              );
            })}
          </div>
        )}

        {/* Remove slot button */}
        {onRemove && (
          <button
            onClick={(e) => { e.stopPropagation(); onRemove(); }}
            className="absolute top-1 left-1 opacity-0 group-hover:opacity-60 hover:!opacity-100 w-5 h-5 text-[10px] bg-white border border-neutral-300 text-red-500 flex items-center justify-center"
          >
            ✕
          </button>
        )}
      </div>
    );
  }

  // Filled slot
  return (
    <div className="relative group w-full h-full overflow-hidden">
      {/* Image */}
      <img
        src={slot.url}
        alt={slot.caption || "Gallery image"}
        className="w-full h-full object-cover"
      />

      {/* Attribution overlay */}
      {slot.attribution && (
        <div className="absolute bottom-0 left-0 right-0 bg-black/40 text-white text-[9px] px-2 py-0.5 opacity-0 group-hover:opacity-100">
          Photo by {slot.attribution}
        </div>
      )}

      {/* Hover action overlay — only when not locked */}
      {!isLocked && (
        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
          {onClickSearch && (
            <button
              onClick={onClickSearch}
              className="w-8 h-8 bg-white text-black flex items-center justify-center text-sm hover:bg-neutral-100"
              title="Search new image"
            >
              🔍
            </button>
          )}
          {onClickPasteUrl && (
            <button
              onClick={onClickPasteUrl}
              className="w-8 h-8 bg-white text-black flex items-center justify-center text-sm hover:bg-neutral-100"
              title="Paste URL"
            >
              🔗
            </button>
          )}
          {onRemove && (
            <button
              onClick={onRemove}
              className="w-8 h-8 bg-white text-red-500 flex items-center justify-center text-sm hover:bg-red-50"
              title="Remove image"
            >
              ✕
            </button>
          )}
        </div>
      )}

      {/* Size toggle on hover — only when not locked */}
      {onResize && (
        <div className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 flex gap-0.5">
          {(["S", "M", "L"] as const).map((label) => {
            const size = label === "S" ? "small" : label === "M" ? "medium" : "large";
            return (
              <button
                key={label}
                onClick={(e) => { e.stopPropagation(); onResize(size); }}
                className={`w-5 h-5 text-[9px] font-bold border ${
                  slot.size === size
                    ? "bg-black text-white border-black"
                    : "bg-white/80 text-neutral-500 border-neutral-300 hover:border-black"
                }`}
              >
                {label}
              </button>
            );
          })}
        </div>
      )}

      {/* Caption below image */}
      {slot.caption !== null && (
        <div className="mt-1 font-bold text-xs uppercase tracking-widest">
          {onUpdateCaption ? (
            <EditableText
              value={slot.caption}
              onChange={onUpdateCaption}
              placeholder="ADD CAPTION"
            />
          ) : (
            <span>{slot.caption}</span>
          )}
        </div>
      )}
    </div>
  );
}
