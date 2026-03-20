"use client";

import { useState, useRef, useEffect } from "react";
import type { Comment } from "@/types/itinerary";

interface CommentBubbleProps {
  comments: Comment[];
  targetType: Comment["targetType"];
  targetDayIndex?: number;
  targetEventIndex?: number;
  targetSlotIndex?: number;
  targetCityId?: string;
  onAdd: (comment: Comment) => void;
  onUpdate: (commentId: string, text: string) => void;
  onRemove: (commentId: string) => void;
  locked?: boolean;
  position?: "below" | "left";  // popover direction
}

export default function CommentBubble({
  comments,
  targetType,
  targetDayIndex,
  targetEventIndex,
  targetSlotIndex,
  targetCityId,
  onAdd,
  onUpdate,
  onRemove,
  locked,
  position = "below",
}: CommentBubbleProps) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState("");
  const popoverRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Filter comments matching this target
  const matching = comments.filter((c) => {
    if (c.targetType !== targetType) return false;
    if (targetDayIndex !== undefined && c.targetDayIndex !== targetDayIndex) return false;
    if (targetEventIndex !== undefined && c.targetEventIndex !== targetEventIndex) return false;
    if (targetSlotIndex !== undefined && c.targetSlotIndex !== targetSlotIndex) return false;
    if (targetCityId !== undefined && c.targetCityId !== targetCityId) return false;
    return true;
  });

  // Hidden when locked
  if (locked) return null;

  const handleAdd = () => {
    if (!draft.trim()) return;
    onAdd({
      id: `c-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      text: draft.trim(),
      createdAt: Date.now(),
      targetType,
      targetDayIndex,
      targetEventIndex,
      targetSlotIndex,
      targetCityId,
    });
    setDraft("");
  };

  return (
    <div className="relative inline-flex" data-no-pdf>
      {/* Bubble icon */}
      <button
        onClick={(e) => { e.stopPropagation(); setOpen(!open); }}
        className="relative text-neutral-300 hover:text-neutral-600 transition-colors"
        title={matching.length > 0 ? `${matching.length} comment(s)` : "Add comment"}
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
        </svg>
        {matching.length > 0 && (
          <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-[#C4973B] rounded-full" />
        )}
      </button>

      {/* Popover */}
      {open && (
        <ClickOutside onClickOutside={() => { setOpen(false); setEditingId(null); }} parentRef={popoverRef}>
          <div
            ref={popoverRef}
            className="absolute z-50 bg-white border-2 border-black shadow-lg p-3 min-w-[220px] max-w-[300px]"
            style={position === "left"
              ? { right: "100%", top: 0, marginRight: 8 }
              : { left: 0, top: "100%", marginTop: 8 }
            }
            onClick={(e) => e.stopPropagation()}
          >
            <p className="text-[8px] font-bold uppercase tracking-widest text-neutral-400 mb-2">
              Comments
            </p>

            {/* Existing comments */}
            {matching.length > 0 ? (
              <div className="space-y-2 mb-3 max-h-40 overflow-y-auto">
                {matching.map((c) => (
                  <div key={c.id} className="group/comment flex gap-2 items-start">
                    {editingId === c.id ? (
                      <input
                        autoFocus
                        value={editDraft}
                        onChange={(e) => setEditDraft(e.target.value)}
                        onBlur={() => {
                          if (editDraft.trim()) onUpdate(c.id, editDraft.trim());
                          setEditingId(null);
                        }}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" && editDraft.trim()) { onUpdate(c.id, editDraft.trim()); setEditingId(null); }
                          if (e.key === "Escape") setEditingId(null);
                        }}
                        className="flex-1 text-xs border-b border-neutral-300 bg-transparent py-0.5 focus:outline-none"
                      />
                    ) : (
                      <p
                        className="flex-1 text-xs text-neutral-700 cursor-pointer hover:text-black"
                        onClick={() => { setEditingId(c.id); setEditDraft(c.text); }}
                      >
                        {c.text}
                      </p>
                    )}
                    <button
                      onClick={() => onRemove(c.id)}
                      className="text-[10px] text-neutral-300 hover:text-red-500 opacity-0 group-hover/comment:opacity-100 shrink-0"
                    >
                      &times;
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-[10px] text-neutral-300 mb-3">No comments yet</p>
            )}

            {/* Add new */}
            <div className="flex gap-1.5">
              <input
                ref={inputRef}
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") handleAdd(); }}
                placeholder="Add a comment..."
                className="flex-1 text-xs border-b border-neutral-300 bg-transparent py-1 focus:outline-none focus:border-black placeholder:text-neutral-300"
              />
              <button
                onClick={handleAdd}
                disabled={!draft.trim()}
                className="text-[9px] font-bold uppercase tracking-widest text-neutral-400 hover:text-black disabled:text-neutral-200"
              >
                Add
              </button>
            </div>
          </div>
        </ClickOutside>
      )}
    </div>
  );
}

/** Helper to detect clicks outside the popover */
function ClickOutside({
  children,
  onClickOutside,
  parentRef,
}: {
  children: React.ReactNode;
  onClickOutside: () => void;
  parentRef: React.RefObject<HTMLDivElement | null>;
}) {
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (parentRef.current && !parentRef.current.contains(e.target as Node)) {
        onClickOutside();
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [onClickOutside, parentRef]);

  return <>{children}</>;
}
