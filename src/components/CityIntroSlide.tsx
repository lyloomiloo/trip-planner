"use client";

import { useState } from "react";
import type { CityData, Comment } from "@/types/itinerary";
import EditableText from "./EditableText";
import EditableTextarea from "./EditableTextarea";
import CommentBubble from "./CommentBubble";

interface CityIntroSlideProps {
  city: CityData;
  maxCityNameLength: number;
  isGenerating?: boolean;
  cityId?: string;
  onRemove?: () => void;
  onRetryGenerate?: () => void;
  onUpdateCity?: (updates: Partial<CityData>) => void;
  locked?: boolean;
  comments?: Comment[];
  onAddComment?: (comment: Comment) => void;
  onUpdateComment?: (commentId: string, text: string) => void;
  onRemoveComment?: (commentId: string) => void;
}

export default function CityIntroSlide({ city, maxCityNameLength, isGenerating, onRemove, onRetryGenerate, onUpdateCity, locked, comments = [], onAddComment, onUpdateComment, onRemoveComment }: CityIntroSlideProps) {
  const canEdit = !locked && !!onUpdateCity;
  const [confirmingRemove, setConfirmingRemove] = useState(false);
  const fallbackSrc = `https://maps.google.com/maps?q=${encodeURIComponent(
    city.name + ", " + city.country
  )}&z=${city.mapZoom}&output=embed`;

  return (
    <section className="group/city relative w-full overflow-hidden border-b-2 border-black flex snap-start" style={{ height: "var(--slide-h)" }}>
      {/* Left panel — city info, scrollable */}
      <div className="w-[22%] shrink-0 bg-white z-20 border-r-2 border-black overflow-y-auto">
        <div className="px-6 py-10">
          {/* City name + country — sized to fill column based on longest city name */}
          <h2
            className="font-black uppercase tracking-tight leading-none whitespace-nowrap"
            style={{ fontSize: `calc((22vw - 48px) * ${1 / (maxCityNameLength * 0.68)})` }}
          >
            {city.name}
          </h2>
          <span className="retro-label mt-2 inline-block">
            {city.country}
          </span>

          <div className="w-6 h-0.5 bg-black mt-4 mb-4" />

          {isGenerating && (
            <div className="mb-4 py-3 px-4 bg-neutral-50 border border-neutral-200">
              <p className="text-[10px] uppercase tracking-widest text-neutral-400 animate-pulse font-bold">
                Generating city info...
              </p>
              <p className="text-[9px] text-neutral-300 mt-1">
                This may take a moment
              </p>
            </div>
          )}

          {!city.description && !isGenerating && (
            <div className="mb-4 py-3 px-4 bg-amber-50 border border-amber-200">
              <p className="text-[10px] uppercase tracking-widest text-amber-500 font-bold">
                Waiting to generate
              </p>
              <p className="text-[9px] text-amber-400 mt-1">
                Rate limited — will auto-retry shortly or{" "}
                {onRetryGenerate ? (
                  <button
                    onClick={onRetryGenerate}
                    className="underline text-amber-600 hover:text-amber-800 font-bold"
                  >
                    click here
                  </button>
                ) : (
                  <span>click here</span>
                )}{" "}
                to refresh manually.
              </p>
            </div>
          )}

          {(city.description || canEdit) && (
            canEdit ? (
              <EditableTextarea
                value={city.description}
                onChange={(v) => onUpdateCity({ description: v })}
                className="text-xs leading-relaxed text-neutral-600"
                placeholder="City description..."
              />
            ) : (
              <p className="text-xs leading-relaxed text-neutral-600">
                {city.description}
              </p>
            )
          )}

          {/* Language & Currency */}
          {(city.language || city.currency || canEdit) && (
            <div className="mt-5 space-y-2">
              <div>
                <p className="retro-label inline-block !text-[9px] !p-0 !bg-transparent">Language</p>
                {canEdit ? (
                  <EditableText
                    value={city.language || ""}
                    onChange={(v) => onUpdateCity!({ language: v })}
                    className="text-xs text-neutral-700 mt-1 block"
                    placeholder="Add language..."
                  />
                ) : city.language ? (
                  <p className="text-xs text-neutral-700 mt-1">{city.language}</p>
                ) : null}
              </div>
              <div>
                <p className="retro-label inline-block !text-[9px] !p-0 !bg-transparent">Currency</p>
                {canEdit ? (
                  <EditableText
                    value={city.currency || ""}
                    onChange={(v) => onUpdateCity!({ currency: v })}
                    className="text-xs text-neutral-700 mt-1 block"
                    placeholder="Add currency..."
                  />
                ) : city.currency ? (
                  <p className="text-xs text-neutral-700 mt-1">{city.currency}</p>
                ) : null}
              </div>
            </div>
          )}

          {/* Transport */}
          {(city.transport || canEdit) && (
            <div className="mt-5">
              <p className="text-[9px] uppercase tracking-[0.15em] text-neutral-400 font-bold">Getting around</p>
              {canEdit ? (
                <EditableTextarea
                  value={city.transport || ""}
                  onChange={(v) => onUpdateCity!({ transport: v })}
                  className="text-xs leading-relaxed text-neutral-700 mt-1"
                  placeholder="Add transport info..."
                />
              ) : (
                <p className="text-xs leading-relaxed text-neutral-700 mt-1">{city.transport}</p>
              )}
            </div>
          )}

          {/* Must try food */}
          {((city.mustTry && city.mustTry.length > 0) || canEdit) && (
            <div className="mt-5">
              <p className="text-[9px] uppercase tracking-[0.15em] text-neutral-400 font-bold">Must try</p>
              <ul className="mt-1 space-y-1">
                {(city.mustTry || []).map((item, i) => (
                  <li key={i} className="text-xs text-neutral-700 flex gap-1.5">
                    <span className="text-neutral-300 shrink-0">-</span>
                    {canEdit ? (
                      <div className="flex-1 flex items-center gap-1">
                        <EditableText
                          value={item}
                          onChange={(v) => {
                            const updated = [...(city.mustTry || [])];
                            updated[i] = v;
                            onUpdateCity!({ mustTry: updated });
                          }}
                          className="text-xs text-neutral-700"
                          placeholder="Item..."
                        />
                        <button
                          onClick={() => {
                            const updated = (city.mustTry || []).filter((_, j) => j !== i);
                            onUpdateCity!({ mustTry: updated });
                          }}
                          className="text-neutral-300 hover:text-red-500 text-[10px] shrink-0"
                        >
                          &times;
                        </button>
                      </div>
                    ) : (
                      item
                    )}
                  </li>
                ))}
              </ul>
              {canEdit && (
                <button
                  onClick={() => onUpdateCity!({ mustTry: [...(city.mustTry || []), ""] })}
                  className="text-[9px] text-neutral-300 hover:text-neutral-500 mt-1 font-bold uppercase tracking-widest"
                >
                  + Add item
                </button>
              )}
            </div>
          )}

          {/* Tips */}
          {((city.tips && city.tips.length > 0) || canEdit) && (
            <div className="mt-5">
              <p className="text-[9px] uppercase tracking-[0.15em] text-neutral-400 font-bold">Tips</p>
              <ul className="mt-1 space-y-1">
                {(city.tips || []).map((tip, i) => (
                  <li key={i} className="text-xs text-neutral-600 leading-relaxed flex gap-1.5">
                    <span className="text-neutral-300 shrink-0">-</span>
                    {canEdit ? (
                      <div className="flex-1 flex items-center gap-1">
                        <EditableText
                          value={tip}
                          onChange={(v) => {
                            const updated = [...(city.tips || [])];
                            updated[i] = v;
                            onUpdateCity!({ tips: updated });
                          }}
                          className="text-xs text-neutral-600"
                          placeholder="Tip..."
                        />
                        <button
                          onClick={() => {
                            const updated = (city.tips || []).filter((_, j) => j !== i);
                            onUpdateCity!({ tips: updated });
                          }}
                          className="text-neutral-300 hover:text-red-500 text-[10px] shrink-0"
                        >
                          &times;
                        </button>
                      </div>
                    ) : (
                      tip
                    )}
                  </li>
                ))}
              </ul>
              {canEdit && (
                <button
                  onClick={() => onUpdateCity!({ tips: [...(city.tips || []), ""] })}
                  className="text-[9px] text-neutral-300 hover:text-neutral-500 mt-1 font-bold uppercase tracking-widest"
                >
                  + Add tip
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Right panel — map with overlaid city name */}
      <div className="relative flex-1">
        <iframe
          src={fallbackSrc}
          className="w-full h-full border-0"
          loading="lazy"
          allowFullScreen
        />

        {/* Split name overlays — spaced apart to avoid overlap */}
        <span
          className="absolute font-black uppercase leading-none text-black select-none pointer-events-none"
          style={{
            top: "4%",
            left: "8%",
            fontSize: "10vw",
            letterSpacing: "-0.03em",
            opacity: 0.85,
          }}
        >
          {city.splitName[0]}
        </span>
        <span
          className="absolute font-black uppercase leading-none text-black select-none pointer-events-none"
          style={{
            top: "4%",
            right: "4%",
            fontSize: "10vw",
            letterSpacing: "-0.03em",
            opacity: 0.85,
          }}
        >
          {city.splitName[1]}
        </span>
        <span
          className="absolute font-black uppercase leading-none text-black select-none pointer-events-none"
          style={{
            bottom: "4%",
            right: "4%",
            fontSize: "12vw",
            letterSpacing: "-0.03em",
            opacity: 0.85,
          }}
        >
          {city.countryLabel}
        </span>
      </div>

      {/* Bottom-right hover controls */}
      {onRemove && (
        <div className="absolute bottom-6 right-6 z-30 flex gap-2 opacity-0 group-hover/city:opacity-100 transition-opacity">
          {!confirmingRemove ? (
            <button onClick={() => setConfirmingRemove(true)} className="bg-black text-white text-[10px] font-bold uppercase tracking-widest px-3 py-1.5 hover:bg-red-700">
              Remove
            </button>
          ) : (
            <div className="flex items-center gap-3 bg-white border-2 border-black px-4 py-2">
              <span className="text-[10px] font-bold uppercase tracking-widest">Remove {city.name}?</span>
              <button onClick={() => { onRemove?.(); setConfirmingRemove(false); }} className="bg-black text-white text-[10px] font-bold uppercase tracking-widest px-3 py-1 hover:bg-red-700">Yes</button>
              <button onClick={() => setConfirmingRemove(false)} className="text-[10px] font-bold uppercase tracking-widest text-neutral-400 hover:text-black">Cancel</button>
            </div>
          )}
        </div>
      )}
    </section>
  );
}
