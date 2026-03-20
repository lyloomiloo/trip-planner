"use client";

import { useState, useEffect } from "react";

interface SlideEntry {
  id: string;
  label: string;
  sublabel?: string;
  type: "cover" | "city" | "day";
}

interface SlideIndexProps {
  slides: SlideEntry[];
}

export default function SlideIndex({ slides }: SlideIndexProps) {
  const [activeId, setActiveId] = useState<string>("");
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setActiveId(entry.target.id);
          }
        }
      },
      { rootMargin: "-40% 0px -40% 0px", threshold: 0 }
    );

    slides.forEach((s) => {
      const el = document.getElementById(s.id);
      if (el) observer.observe(el);
    });

    return () => observer.disconnect();
  }, [slides]);

  const scrollTo = (id: string) => {
    const el = document.getElementById(id);
    if (el) el.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <>
      {/* Pull tab — always visible on right edge */}
      <button
        onClick={() => setOpen(true)}
        onMouseEnter={() => setOpen(true)}
        className={`fixed right-0 top-1/2 -translate-y-1/2 z-50 bg-black text-white w-6 h-12 flex items-center justify-center transition-opacity ${
          open ? "opacity-0 pointer-events-none" : "opacity-100 hover:opacity-100"
        }`}
        title="Open index"
      >
        <span className="text-[10px]">&larr;</span>
      </button>

      {/* Backdrop — click to close */}
      {open && (
        <div
          className="fixed inset-0 z-50"
          onClick={() => setOpen(false)}
        />
      )}

      {/* Slide-in sidebar */}
      <div
        className={`fixed right-0 top-0 bottom-0 z-50 bg-white border-l-2 border-black w-44 sm:w-52 transition-transform duration-200 ease-out overflow-y-auto ${
          open ? "translate-x-0" : "translate-x-full"
        }`}
        onMouseLeave={() => setOpen(false)}
      >
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-neutral-200 px-4 py-2.5 flex items-center justify-between">
          <span className="text-[8px] font-bold uppercase tracking-widest text-neutral-400">
            Index
          </span>
          <button
            onClick={() => setOpen(false)}
            className="text-neutral-300 hover:text-black text-xs"
          >
            &times;
          </button>
        </div>

        {/* Nav items */}
        <div className="py-2 px-1.5">
          {slides.map((slide) => {
            const isActive = activeId === slide.id;
            const isCity = slide.type === "city" || slide.type === "cover";

            return (
              <button
                key={slide.id}
                onClick={() => { scrollTo(slide.id); setOpen(false); }}
                className={`w-full flex items-center gap-2 px-2.5 py-1.5 text-left transition-colors rounded-sm group/idx overflow-hidden ${
                  isActive
                    ? "bg-neutral-50"
                    : "hover:text-[#C80815]"
                }`}
              >
                {/* Dot */}
                <span
                  className={`block rounded-full shrink-0 ${
                    isCity
                      ? isActive
                        ? "w-2 h-2 bg-black"
                        : "w-1.5 h-1.5 bg-neutral-300"
                      : isActive
                      ? "w-1.5 h-1.5 bg-[#C80815]"
                      : "w-1 h-1 bg-neutral-200"
                  }`}
                />

                {/* Label */}
                <span
                  className={`text-[11px] font-bold uppercase tracking-widest transition-colors shrink-0 ${
                    isActive ? "text-black" : "text-neutral-400 group-hover/idx:text-[#C80815]"
                  }`}
                >
                  {slide.label}
                </span>

                {/* Sublabel — weather location */}
                {slide.sublabel && (
                  <span className={`text-[10px] uppercase tracking-widest ml-auto truncate max-w-[55%] transition-colors ${
                    isActive ? "text-neutral-400" : "text-neutral-300 group-hover/idx:text-[#C80815]/40"
                  }`} title={slide.sublabel}>
                    {slide.sublabel}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>
    </>
  );
}
