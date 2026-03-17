"use client";

import { useState, useCallback } from "react";
import type { GallerySlot as GallerySlotType } from "@/types/itinerary";
import GallerySlot from "./GallerySlot";
import ImageSearchModal from "./ImageSearchModal";
import { searchImages } from "@/lib/images";

interface ImageGalleryProps {
  gallery: GallerySlotType[];
  onUpdateSlot: (index: number, slot: Partial<GallerySlotType>) => void;
  onAddSlot: () => void;
  onRemoveSlot: (index: number) => void;
  autoSearchTerms?: string[]; // e.g. ["Geneva", "Lake Geneva", "Cottage Cafe"]
  locked?: boolean;
}

// Map slot sizes to CSS grid row/col spans
function sizeToSpan(size: string) {
  switch (size) {
    case "large":
      return { colSpan: "col-span-2", rowSpan: "row-span-2", height: "h-64" };
    case "medium":
      return { colSpan: "col-span-1", rowSpan: "row-span-1", height: "h-48" };
    case "small":
      return { colSpan: "col-span-1", rowSpan: "row-span-1", height: "h-36" };
    default:
      return { colSpan: "col-span-1", rowSpan: "row-span-1", height: "h-48" };
  }
}

export default function ImageGallery({
  gallery,
  onUpdateSlot,
  onAddSlot,
  onRemoveSlot,
  autoSearchTerms,
  locked,
}: ImageGalleryProps) {
  const [modalOpen, setModalOpen] = useState(false);
  const [activeSlotIndex, setActiveSlotIndex] = useState<number | null>(null);
  const [defaultTab, setDefaultTab] = useState<"search" | "url" | "upload">("search");
  const [autoFilling, setAutoFilling] = useState(false);
  const [autoFillPage, setAutoFillPage] = useState(1);

  const openModal = (index: number, tab: "search" | "url" | "upload" = "search") => {
    setActiveSlotIndex(index);
    setDefaultTab(tab);
    setModalOpen(true);
  };

  const handleImageSelect = (url: string, attribution?: string, source?: "search" | "url" | "upload") => {
    if (activeSlotIndex !== null) {
      onUpdateSlot(activeSlotIndex, { url, attribution, source });
    }
    setModalOpen(false);
    setActiveSlotIndex(null);
  };

  // Auto-fill empty slots with images from search terms
  const handleAutoFill = useCallback(async (page: number = 1) => {
    if (!autoSearchTerms || autoSearchTerms.length === 0) return;

    const emptySlotIndices = gallery
      .map((s, i) => (!s.url ? i : -1))
      .filter((i) => i >= 0);

    if (emptySlotIndices.length === 0) return;

    setAutoFilling(true);

    // Search for each term and distribute results across empty slots
    let slotCursor = 0;
    for (const term of autoSearchTerms) {
      if (slotCursor >= emptySlotIndices.length) break;

      try {
        const results = await searchImages(term, 2, page);
        for (const result of results) {
          if (slotCursor >= emptySlotIndices.length) break;
          const slotIdx = emptySlotIndices[slotCursor];
          onUpdateSlot(slotIdx, {
            url: result.url,
            attribution: result.photographer,
            source: "search",
            caption: term.toUpperCase(),
          });
          slotCursor++;
        }
      } catch {
        // skip this term
      }
    }

    setAutoFilling(false);
  }, [autoSearchTerms, gallery, onUpdateSlot]);

  // Refresh: clear all auto-filled images, then re-fill with next page
  const handleRefreshAutoFill = useCallback(async () => {
    // Clear slots that were auto-filled (source === "search")
    gallery.forEach((slot, i) => {
      if (slot.url && slot.source === "search") {
        onUpdateSlot(i, { url: null, attribution: undefined, source: undefined, caption: null });
      }
    });

    const nextPage = autoFillPage + 1;
    setAutoFillPage(nextPage);

    // Small delay to let state update before re-filling
    await new Promise((r) => setTimeout(r, 100));
    handleAutoFill(nextPage);
  }, [gallery, onUpdateSlot, autoFillPage, handleAutoFill]);

  const hasEmptySlots = gallery.some((s) => !s.url);
  const hasAutoFilledSlots = gallery.some((s) => s.url && s.source === "search");

  return (
    <>
      <div className="grid grid-cols-2 gap-2 auto-rows-min">
        {gallery.map((slot, i) => {
          // In locked mode, hide empty slots (no image)
          if (locked && !slot.url) return null;
          const span = sizeToSpan(slot.size);
          return (
            <div
              key={`${slot.slot}-${i}`}
              className={`${span.colSpan} ${span.rowSpan} ${span.height}`}
            >
              <GallerySlot
                slot={slot}
                onClickEmpty={locked ? undefined : () => openModal(i, "search")}
                onClickSearch={locked ? undefined : () => openModal(i, "search")}
                onClickPasteUrl={locked ? undefined : () => openModal(i, "url")}
                onRemove={locked ? undefined : () => {
                  if (slot.url) {
                    onUpdateSlot(i, { url: null, attribution: undefined, source: undefined });
                  } else {
                    onRemoveSlot(i);
                  }
                }}
                onUpdateCaption={locked ? undefined : (caption) => onUpdateSlot(i, { caption })}
                onResize={locked ? undefined : (size) => onUpdateSlot(i, { size })}
              />
            </div>
          );
        })}

        {/* Add slot + auto-fill buttons — hidden when locked */}
        {!locked && (
          <div className="col-span-1 h-24 flex items-center justify-center gap-4">
            <button
              onClick={onAddSlot}
              className="text-xs text-neutral-400 hover:text-neutral-600 flex items-center gap-1"
            >
              <span className="text-2xl leading-none font-light">+</span> Add slot
            </button>
            {hasEmptySlots && autoSearchTerms && autoSearchTerms.length > 0 && (
              <button
                onClick={() => handleAutoFill(autoFillPage)}
                disabled={autoFilling}
                className="text-xs text-neutral-300 hover:text-neutral-500 flex items-center gap-1"
              >
                {autoFilling ? "Filling..." : "Auto-fill images"}
              </button>
            )}
            {hasAutoFilledSlots && !autoFilling && (
              <button
                onClick={handleRefreshAutoFill}
                className="text-xs text-neutral-300 hover:text-neutral-500 flex items-center gap-1"
                title="Get different images"
              >
                ↻ Refresh
              </button>
            )}
          </div>
        )}
      </div>

      {/* Image Search Modal */}
      {modalOpen && (
        <ImageSearchModal
          defaultTab={defaultTab}
          onSelect={handleImageSelect}
          onClose={() => { setModalOpen(false); setActiveSlotIndex(null); }}
        />
      )}
    </>
  );
}
