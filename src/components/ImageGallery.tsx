"use client";

import { useState, useCallback, useMemo } from "react";
import type { GallerySlot as GallerySlotType } from "@/types/itinerary";
import GallerySlot from "./GallerySlot";
import ImageSearchModal from "./ImageSearchModal";
import { searchImages } from "@/lib/images";

interface ImageGalleryProps {
  gallery: GallerySlotType[];
  onUpdateSlot: (index: number, slot: Partial<GallerySlotType>) => void;
  onAddSlot: () => void;
  onRemoveSlot: (index: number) => void;
  autoSearchTerms?: string[];
  locked?: boolean;
  dayNumber?: number; // used as seed for layout randomization
}

// ──────────────────────────────────────────────────
// Layout templates — each defines CSS grid areas
// for an organic, asymmetric collage look.
// Positions are defined as { gridColumn, gridRow }
// on a 12-column × 12-row grid.
// ──────────────────────────────────────────────────

interface SlotPlacement {
  gridColumn: string;
  gridRow: string;
}

interface LayoutTemplate {
  columns: string;
  rows: string;
  slots: SlotPlacement[];
}

// All templates use a 12×12 grid with NO overlapping areas.

// Templates for exactly 5 slots
const TEMPLATES_5: LayoutTemplate[] = [
  {
    // Layout A: large top-left, medium top-right, medium bottom-left, small bottom-center, medium bottom-right
    columns: "repeat(12, 1fr)",
    rows: "repeat(12, 1fr)",
    slots: [
      { gridColumn: "1 / 7", gridRow: "1 / 7" },
      { gridColumn: "7 / 13", gridRow: "1 / 7" },
      { gridColumn: "1 / 5", gridRow: "7 / 13" },
      { gridColumn: "5 / 8", gridRow: "7 / 13" },
      { gridColumn: "8 / 13", gridRow: "7 / 13" },
    ],
  },
  {
    // Layout B: tall left, small top-right, small mid-right, wide bottom
    columns: "repeat(12, 1fr)",
    rows: "repeat(12, 1fr)",
    slots: [
      { gridColumn: "1 / 7", gridRow: "1 / 8" },
      { gridColumn: "7 / 13", gridRow: "1 / 4" },
      { gridColumn: "7 / 13", gridRow: "4 / 8" },
      { gridColumn: "1 / 6", gridRow: "8 / 13" },
      { gridColumn: "6 / 13", gridRow: "8 / 13" },
    ],
  },
  {
    // Layout C: large top-left, small top-right, small mid-right, medium bottom-left, medium bottom-right
    columns: "repeat(12, 1fr)",
    rows: "repeat(12, 1fr)",
    slots: [
      { gridColumn: "1 / 8", gridRow: "1 / 7" },
      { gridColumn: "8 / 13", gridRow: "1 / 4" },
      { gridColumn: "8 / 13", gridRow: "4 / 7" },
      { gridColumn: "1 / 7", gridRow: "7 / 13" },
      { gridColumn: "7 / 13", gridRow: "7 / 13" },
    ],
  },
  {
    // Layout D: two columns top, three columns bottom
    columns: "repeat(12, 1fr)",
    rows: "repeat(12, 1fr)",
    slots: [
      { gridColumn: "1 / 5", gridRow: "1 / 7" },
      { gridColumn: "5 / 13", gridRow: "1 / 7" },
      { gridColumn: "1 / 5", gridRow: "7 / 13" },
      { gridColumn: "5 / 9", gridRow: "7 / 13" },
      { gridColumn: "9 / 13", gridRow: "7 / 13" },
    ],
  },
  {
    // Layout E: three columns top, two columns bottom
    columns: "repeat(12, 1fr)",
    rows: "repeat(12, 1fr)",
    slots: [
      { gridColumn: "1 / 5", gridRow: "1 / 6" },
      { gridColumn: "5 / 9", gridRow: "1 / 6" },
      { gridColumn: "9 / 13", gridRow: "1 / 6" },
      { gridColumn: "1 / 7", gridRow: "6 / 13" },
      { gridColumn: "7 / 13", gridRow: "6 / 13" },
    ],
  },
];

// Templates for 4 slots
const TEMPLATES_4: LayoutTemplate[] = [
  {
    columns: "repeat(12, 1fr)",
    rows: "repeat(12, 1fr)",
    slots: [
      { gridColumn: "1 / 8", gridRow: "1 / 7" },
      { gridColumn: "8 / 13", gridRow: "1 / 7" },
      { gridColumn: "1 / 5", gridRow: "7 / 13" },
      { gridColumn: "5 / 13", gridRow: "7 / 13" },
    ],
  },
  {
    columns: "repeat(12, 1fr)",
    rows: "repeat(12, 1fr)",
    slots: [
      { gridColumn: "1 / 7", gridRow: "1 / 8" },
      { gridColumn: "7 / 13", gridRow: "1 / 5" },
      { gridColumn: "7 / 13", gridRow: "5 / 13" },
      { gridColumn: "1 / 7", gridRow: "8 / 13" },
    ],
  },
  {
    columns: "repeat(12, 1fr)",
    rows: "repeat(12, 1fr)",
    slots: [
      { gridColumn: "1 / 13", gridRow: "1 / 5" },
      { gridColumn: "1 / 6", gridRow: "5 / 10" },
      { gridColumn: "6 / 13", gridRow: "5 / 10" },
      { gridColumn: "1 / 13", gridRow: "10 / 13" },
    ],
  },
];

// Templates for 3 slots
const TEMPLATES_3: LayoutTemplate[] = [
  {
    columns: "repeat(12, 1fr)",
    rows: "repeat(12, 1fr)",
    slots: [
      { gridColumn: "1 / 8", gridRow: "1 / 7" },
      { gridColumn: "8 / 13", gridRow: "1 / 7" },
      { gridColumn: "1 / 13", gridRow: "7 / 13" },
    ],
  },
  {
    columns: "repeat(12, 1fr)",
    rows: "repeat(12, 1fr)",
    slots: [
      { gridColumn: "1 / 13", gridRow: "1 / 6" },
      { gridColumn: "1 / 6", gridRow: "6 / 13" },
      { gridColumn: "6 / 13", gridRow: "6 / 13" },
    ],
  },
];

// Templates for 2 slots
const TEMPLATES_2: LayoutTemplate[] = [
  {
    columns: "repeat(12, 1fr)",
    rows: "repeat(12, 1fr)",
    slots: [
      { gridColumn: "1 / 8", gridRow: "1 / 13" },
      { gridColumn: "8 / 13", gridRow: "1 / 13" },
    ],
  },
  {
    columns: "repeat(12, 1fr)",
    rows: "repeat(12, 1fr)",
    slots: [
      { gridColumn: "1 / 13", gridRow: "1 / 7" },
      { gridColumn: "1 / 13", gridRow: "7 / 13" },
    ],
  },
];

// Template for 1 slot
const TEMPLATES_1: LayoutTemplate[] = [
  {
    columns: "1fr",
    rows: "1fr",
    slots: [{ gridColumn: "1 / -1", gridRow: "1 / -1" }],
  },
];

function pickTemplate(count: number, seed: number): LayoutTemplate {
  let templates: LayoutTemplate[];
  if (count >= 5) templates = TEMPLATES_5;
  else if (count === 4) templates = TEMPLATES_4;
  else if (count === 3) templates = TEMPLATES_3;
  else if (count === 2) templates = TEMPLATES_2;
  else templates = TEMPLATES_1;

  return templates[seed % templates.length];
}

export default function ImageGallery({
  gallery,
  onUpdateSlot,
  onAddSlot,
  onRemoveSlot,
  autoSearchTerms,
  locked,
  dayNumber = 1,
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
    gallery.forEach((slot, i) => {
      if (slot.url && slot.source === "search") {
        onUpdateSlot(i, { url: null, attribution: undefined, source: undefined, caption: null });
      }
    });

    const nextPage = autoFillPage + 1;
    setAutoFillPage(nextPage);

    await new Promise((r) => setTimeout(r, 100));
    handleAutoFill(nextPage);
  }, [gallery, onUpdateSlot, autoFillPage, handleAutoFill]);

  // Determine which slots to render (in locked mode, hide empty ones)
  const visibleSlots = useMemo(() => {
    if (locked) {
      return gallery
        .map((slot, i) => ({ slot, originalIndex: i }))
        .filter(({ slot }) => !!slot.url);
    }
    return gallery.map((slot, i) => ({ slot, originalIndex: i }));
  }, [gallery, locked]);

  // Pick a layout template based on visible slot count and day number as seed
  const template = useMemo(
    () => pickTemplate(visibleSlots.length, dayNumber),
    [visibleSlots.length, dayNumber]
  );

  const hasEmptySlots = gallery.some((s) => !s.url);
  const hasAutoFilledSlots = gallery.some((s) => s.url && s.source === "search");

  if (visibleSlots.length === 0 && locked) return null;

  return (
    <>
      {/* Auto-fill buttons above gallery — hidden when locked */}
      {!locked && autoSearchTerms && autoSearchTerms.length > 0 && (
        <div className="flex items-center gap-3 mb-2">
          {hasEmptySlots && (
            <button
              onClick={() => handleAutoFill(autoFillPage)}
              disabled={autoFilling}
              className="text-[10px] font-bold uppercase tracking-widest text-neutral-300 hover:text-neutral-500"
            >
              {autoFilling ? "Filling..." : "Auto-fill images"}
            </button>
          )}
          {hasAutoFilledSlots && !autoFilling && (
            <button
              onClick={handleRefreshAutoFill}
              className="text-[10px] font-bold uppercase tracking-widest text-neutral-300 hover:text-neutral-500"
              title="Get different images"
            >
              ↻ Refresh
            </button>
          )}
        </div>
      )}

      <div
        className="relative w-full"
        style={{
          display: "grid",
          gridTemplateColumns: template.columns,
          gridTemplateRows: template.rows,
          gap: "6px",
          height: "100%",
          maxHeight: "100%",
        }}
      >
        {visibleSlots.map(({ slot, originalIndex }, vi) => {
          const placement = template.slots[vi];
          if (!placement) {
            // More slots than template supports — fall back to auto placement
            return (
              <div
                key={`${slot.slot}-${originalIndex}`}
                style={{ gridColumn: "span 6", gridRow: "span 4" }}
              >
                <GallerySlot
                  slot={slot}
                  onClickEmpty={locked ? undefined : () => openModal(originalIndex, "search")}
                  onClickSearch={locked ? undefined : () => openModal(originalIndex, "search")}
                  onClickPasteUrl={locked ? undefined : () => openModal(originalIndex, "url")}
                  onRemove={locked ? undefined : () => {
                    if (slot.url) {
                      onUpdateSlot(originalIndex, { url: null, attribution: undefined, source: undefined });
                    } else {
                      onRemoveSlot(originalIndex);
                    }
                  }}
                  onUpdateCaption={locked ? undefined : (caption) => onUpdateSlot(originalIndex, { caption })}
                  onResize={locked ? undefined : (size) => onUpdateSlot(originalIndex, { size })}
                />
              </div>
            );
          }

          return (
            <div
              key={`${slot.slot}-${originalIndex}`}
              style={{
                gridColumn: placement.gridColumn,
                gridRow: placement.gridRow,
              }}
            >
              <GallerySlot
                slot={slot}
                onClickEmpty={locked ? undefined : () => openModal(originalIndex, "search")}
                onClickSearch={locked ? undefined : () => openModal(originalIndex, "search")}
                onClickPasteUrl={locked ? undefined : () => openModal(originalIndex, "url")}
                onRemove={locked ? undefined : () => {
                  if (slot.url) {
                    onUpdateSlot(originalIndex, { url: null, attribution: undefined, source: undefined });
                  } else {
                    onRemoveSlot(originalIndex);
                  }
                }}
                onUpdateCaption={locked ? undefined : (caption) => onUpdateSlot(originalIndex, { caption })}
                onResize={locked ? undefined : (size) => onUpdateSlot(originalIndex, { size })}
              />
            </div>
          );
        })}
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
