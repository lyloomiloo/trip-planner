"use client";

import { useEffect, useRef } from "react";

const PRESET_COLORS = [
  { hex: "#2D2D2D", label: "Black" },
  { hex: "#C80815", label: "Red" },
  { hex: "#C4973B", label: "Gold" },
  { hex: "#4A7C9B", label: "Blue" },
  { hex: "#8B9D83", label: "Green" },
  { hex: "#8B7B9B", label: "Purple" },
  { hex: "#D0D0D0", label: "Gray" },
  { hex: "#FFFFFF", label: "White" },
];

const BG_COLORS = [
  { hex: "#FEF3C7", label: "Warm" },
  { hex: "#DBEAFE", label: "Cool" },
  { hex: "#DCFCE7", label: "Mint" },
  { hex: "#F3E8FF", label: "Lavender" },
  { hex: "#FEE2E2", label: "Rose" },
  { hex: "#F5F5F0", label: "Cream" },
  { hex: "#E5E5E5", label: "Light Gray" },
  { hex: "#2D2D2D", label: "Dark" },
];

interface ColorPickerProps {
  textColor?: string;
  highlightColor?: string;
  onChangeTextColor: (color: string | undefined) => void;
  onChangeHighlightColor: (color: string | undefined) => void;
  onClose: () => void;
}

export default function ColorPicker({
  textColor,
  highlightColor,
  onChangeTextColor,
  onChangeHighlightColor,
  onClose,
}: ColorPickerProps) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        onClose();
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [onClose]);

  return (
    <div
      ref={ref}
      className="absolute z-50 bg-white border-2 border-black shadow-lg p-3 min-w-[180px]"
      style={{ right: 0, top: "100%" }}
    >
      {/* Text color row */}
      <p className="text-[8px] font-bold uppercase tracking-widest text-neutral-400 mb-1.5">Text</p>
      <div className="flex gap-1.5 mb-3">
        {/* Reset button */}
        <button
          onClick={() => onChangeTextColor(undefined)}
          className="w-5 h-5 border border-neutral-300 flex items-center justify-center text-[8px] text-neutral-400 hover:border-black"
          title="Reset to default"
        >
          ✕
        </button>
        {PRESET_COLORS.map((c) => (
          <button
            key={c.hex}
            onClick={() => onChangeTextColor(c.hex)}
            className={`w-5 h-5 border-2 ${textColor === c.hex ? "border-black scale-110" : "border-transparent hover:border-neutral-400"}`}
            style={{ backgroundColor: c.hex }}
            title={c.label}
          />
        ))}
      </div>

      {/* Background color row */}
      <p className="text-[8px] font-bold uppercase tracking-widest text-neutral-400 mb-1.5">Background</p>
      <div className="flex gap-1.5">
        <button
          onClick={() => onChangeHighlightColor(undefined)}
          className="w-5 h-5 border border-neutral-300 flex items-center justify-center text-[8px] text-neutral-400 hover:border-black"
          title="Reset to default"
        >
          ✕
        </button>
        {BG_COLORS.map((c) => (
          <button
            key={c.hex}
            onClick={() => onChangeHighlightColor(c.hex)}
            className={`w-5 h-5 border-2 ${highlightColor === c.hex ? "border-black scale-110" : "border-transparent hover:border-neutral-400"}`}
            style={{ backgroundColor: c.hex }}
            title={c.label}
          />
        ))}
      </div>
    </div>
  );
}
