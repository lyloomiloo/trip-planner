"use client";

import { useState } from "react";
import type { GallerySlot as GallerySlotType } from "@/types/itinerary";
import GallerySlot from "./GallerySlot";
import ImageSearchModal from "./ImageSearchModal";

interface ImageGalleryProps {
  gallery: GallerySlotType[];
  onUpdateSlot: (index: number, slot: Partial<GallerySlotType>) => void;
  onAddSlot: () => void;
  onRemoveSlot: (index: number) => void;
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
}: ImageGalleryProps) {
  const [modalOpen, setModalOpen] = useState(false);
  const [activeSlotIndex, setActiveSlotIndex] = useState<number | null>(null);
  const [defaultTab, setDefaultTab] = useState<"search" | "url" | "upload">("search");

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

  return (
    <>
      <div className="grid grid-cols-2 gap-2 auto-rows-min">
        {gallery.map((slot, i) => {
          const span = sizeToSpan(slot.size);
          return (
            <div
              key={`${slot.slot}-${i}`}
              className={`${span.colSpan} ${span.rowSpan} ${span.height}`}
            >
              <GallerySlot
                slot={slot}
                onClickEmpty={() => openModal(i, "search")}
                onClickSearch={() => openModal(i, "search")}
                onClickPasteUrl={() => openModal(i, "url")}
                onRemove={() => {
                  if (slot.url) {
                    onUpdateSlot(i, { url: null, attribution: undefined, source: undefined });
                  } else {
                    onRemoveSlot(i);
                  }
                }}
                onUpdateCaption={(caption) => onUpdateSlot(i, { caption })}
                onResize={(size) => onUpdateSlot(i, { size })}
              />
            </div>
          );
        })}

        {/* Add slot button */}
        <div className="col-span-1 h-24 flex items-center justify-center">
          <button
            onClick={onAddSlot}
            className="text-xs text-neutral-400 hover:text-neutral-600 flex items-center gap-1"
          >
            <span className="text-2xl leading-none font-light">+</span> Add slot
          </button>
        </div>
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
