"use client";

import { useRef } from "react";

interface ToolbarProps {
  onExport: () => void;
  onImport: (file: File) => void;
  onReset: () => void;
  onBack: () => void;
}

export default function Toolbar({ onExport, onImport, onReset, onBack }: ToolbarProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  return (
    <div className="sticky top-0 z-40 bg-white border-b-2 border-black flex items-center justify-between px-6 py-2.5">
      <button
        onClick={onBack}
        className="text-xs font-bold uppercase tracking-widest text-neutral-400 hover:text-black"
      >
        &larr; Back
      </button>

      <div className="flex items-center gap-3">
        <button
          onClick={onExport}
          className="text-[10px] font-bold uppercase tracking-widest text-neutral-500 hover:text-black"
        >
          Export
        </button>
        <button
          onClick={() => fileInputRef.current?.click()}
          className="text-[10px] font-bold uppercase tracking-widest text-neutral-500 hover:text-black"
        >
          Import
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept=".json"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) onImport(file);
          }}
        />
        <button
          onClick={onReset}
          className="text-[10px] font-bold uppercase tracking-widest text-neutral-400 hover:text-red-500"
        >
          Reset
        </button>
      </div>
    </div>
  );
}
