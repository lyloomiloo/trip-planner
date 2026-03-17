"use client";

import { useRef, useState } from "react";

interface ToolbarProps {
  onImport: (file: File) => void;
  onExport: () => Promise<void> | void;
  onOverview: () => void;
  onAddDay: () => void;
  onAddCity: () => void;
  onReset: () => void;
  onBack: () => void;
}

export default function Toolbar({
  onImport,
  onExport,
  onOverview,
  onAddDay,
  onAddCity,
  onReset,
  onBack,
}: ToolbarProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [exporting, setExporting] = useState(false);

  const handleExport = async () => {
    setExporting(true);
    await onExport();
    setExporting(false);
  };

  const btnClass =
    "text-[10px] font-bold uppercase tracking-widest text-neutral-500 hover:text-black transition-colors";

  return (
    <div
      className="sticky top-0 z-40 bg-white border-b-2 border-black flex items-center justify-between px-6"
      style={{ height: "var(--toolbar-h)" }}
    >
      <button
        onClick={onBack}
        className="text-xs font-bold uppercase tracking-widest text-neutral-400 hover:text-black"
      >
        &larr; Back
      </button>

      <div className="flex items-center gap-5">
        <button onClick={onAddDay} className={btnClass}>
          + Day
        </button>
        <button onClick={onAddCity} className={btnClass}>
          + City
        </button>

        <span className="text-neutral-200">|</span>

        <button onClick={() => fileInputRef.current?.click()} className={btnClass}>
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

        <button onClick={handleExport} className={btnClass} disabled={exporting}>
          {exporting ? "Exporting..." : "Export"}
        </button>

        <span className="text-neutral-200">|</span>

        <button onClick={onOverview} className={btnClass}>
          Overview
        </button>

        <span className="text-neutral-200">|</span>

        <button
          onClick={onReset}
          className="text-[10px] font-bold uppercase tracking-widest text-neutral-400 hover:text-red-500 transition-colors"
        >
          Reset
        </button>
      </div>
    </div>
  );
}
