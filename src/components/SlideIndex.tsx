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
  const [hovered, setHovered] = useState(false);

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
    <div
      className="fixed right-0 top-0 bottom-0 z-50 flex items-center justify-end"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* Gradient backdrop on hover */}
      <div
        className={`absolute inset-y-0 right-0 transition-opacity duration-200 pointer-events-none ${
          hovered ? "opacity-100" : "opacity-0"
        }`}
        style={{
          width: "220px",
          background: "linear-gradient(to right, transparent, rgba(255,255,255,0.5) 50%)",
        }}
      />

      {/* Dot nav — right aligned */}
      <div className="relative flex flex-col items-end gap-1.5 pr-4">
        {slides.map((slide) => {
          const isActive = activeId === slide.id;
          return (
            <button
              key={slide.id}
              onClick={() => scrollTo(slide.id)}
              className="flex items-center gap-2 group/dot"
            >
              {/* Label — shows on hover */}
              <span
                className={`text-[9px] font-bold uppercase tracking-widest whitespace-nowrap transition-all duration-200 text-black group-hover/dot:text-[#C80815] ${
                  hovered ? "opacity-100" : "opacity-0 w-0 overflow-hidden"
                }`}
              >
                {slide.label}
                {slide.sublabel && (
                  <span className="ml-1 opacity-40 group-hover/dot:opacity-100">{slide.sublabel}</span>
                )}
              </span>

              {/* Dot */}
              <span
                className={`block rounded-full shrink-0 transition-all ${
                  slide.type === "city" || slide.type === "cover"
                    ? isActive
                      ? "w-3 h-3 bg-black"
                      : "w-2.5 h-2.5 bg-neutral-300 group-hover/dot:bg-[#C80815]"
                    : isActive
                    ? "w-2 h-2 bg-black"
                    : "w-1.5 h-1.5 bg-neutral-300 group-hover/dot:bg-[#C80815]"
                }`}
              />
            </button>
          );
        })}
      </div>
    </div>
  );
}
