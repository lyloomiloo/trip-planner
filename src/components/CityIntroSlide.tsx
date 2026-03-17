"use client";

import type { CityData } from "@/types/itinerary";

export default function CityIntroSlide({ city }: { city: CityData }) {
  const fallbackSrc = `https://maps.google.com/maps?q=${encodeURIComponent(
    city.name + ", " + city.country
  )}&z=${city.mapZoom}&output=embed`;

  return (
    <section className="relative h-screen w-full overflow-hidden border-b-2 border-black flex">
      {/* Left panel — city info, scrollable */}
      <div className="w-[22%] shrink-0 bg-white z-20 border-r-2 border-black overflow-y-auto">
        <div className="px-6 py-10">
          {/* City name + country */}
          <h2 className="text-4xl font-black uppercase tracking-tight leading-tight">
            {city.name}
          </h2>
          <span className="retro-label mt-2 inline-block">
            {city.country}
          </span>

          <div className="w-6 h-0.5 bg-black mt-4 mb-4" />

          <p className="text-xs leading-relaxed text-neutral-600">
            {city.description}
          </p>

          {/* Language & Currency */}
          {(city.language || city.currency) && (
            <div className="mt-5 space-y-2">
              {city.language && (
                <div>
                  <p className="retro-label inline-block !text-[9px] !p-0 !bg-transparent">Language</p>
                  <p className="text-xs text-neutral-700">{city.language}</p>
                </div>
              )}
              {city.currency && (
                <div>
                  <p className="retro-label inline-block !text-[9px] !p-0 !bg-transparent">Currency</p>
                  <p className="text-xs text-neutral-700">{city.currency}</p>
                </div>
              )}
            </div>
          )}

          {/* Transport */}
          {city.transport && (
            <div className="mt-5">
              <p className="text-[9px] uppercase tracking-[0.15em] text-neutral-400 font-bold">Getting around</p>
              <p className="text-xs leading-relaxed text-neutral-700 mt-1">{city.transport}</p>
            </div>
          )}

          {/* Must try food */}
          {city.mustTry && city.mustTry.length > 0 && (
            <div className="mt-5">
              <p className="text-[9px] uppercase tracking-[0.15em] text-neutral-400 font-bold">Must try</p>
              <ul className="mt-1 space-y-1">
                {city.mustTry.map((item, i) => (
                  <li key={i} className="text-xs text-neutral-700 flex gap-1.5">
                    <span className="text-neutral-300 shrink-0">-</span>
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Tips */}
          {city.tips && city.tips.length > 0 && (
            <div className="mt-5">
              <p className="text-[9px] uppercase tracking-[0.15em] text-neutral-400 font-bold">Tips</p>
              <ul className="mt-1 space-y-1">
                {city.tips.map((tip, i) => (
                  <li key={i} className="text-xs text-neutral-600 leading-relaxed flex gap-1.5">
                    <span className="text-neutral-300 shrink-0">-</span>
                    {tip}
                  </li>
                ))}
              </ul>
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
    </section>
  );
}
