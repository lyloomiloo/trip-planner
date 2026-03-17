import type { CityData } from "@/types/itinerary";

export type GenerateResult =
  | { status: "ok"; data: Partial<CityData> }
  | { status: "rate-limited" }
  | { status: "error" };

const MAX_RETRIES = 3;

export async function generateCityDetails(
  cityName: string
): Promise<GenerateResult> {
  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    try {
      const res = await fetch("/api/generate-city", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cityName }),
      });

      if (res.status === 429 || res.status === 503) {
        const waitSec = Math.min(15 * (attempt + 1), 60);
        console.warn(
          `[gemini] Rate limited for "${cityName}", retrying in ${waitSec}s (attempt ${attempt + 1}/${MAX_RETRIES})`
        );
        await new Promise((r) => setTimeout(r, waitSec * 1000));
        continue;
      }

      if (!res.ok) {
        console.error("[gemini] API error for", cityName);
        return { status: "error" };
      }

      const data = await res.json();
      console.log("[gemini] Got details for", cityName, ":", data.country);
      return { status: "ok", data };
    } catch (err) {
      console.error("[gemini] Fetch error for", cityName, ":", err);
      return { status: "error" };
    }
  }

  console.error("[gemini] All retries exhausted for", cityName);
  return { status: "rate-limited" };
}

// ─── Background retry queue ────────────────────────────
// Stores { cityId, cityName } pairs that need generation
const PENDING_KEY = "gemini_pending_cities";

export function queuePendingCity(cityId: string, cityName: string) {
  const pending = getPendingCities();
  if (!pending.find((p) => p.cityId === cityId)) {
    pending.push({ cityId, cityName });
    localStorage.setItem(PENDING_KEY, JSON.stringify(pending));
  }
}

export function removePendingCity(cityId: string) {
  const pending = getPendingCities().filter((p) => p.cityId !== cityId);
  localStorage.setItem(PENDING_KEY, JSON.stringify(pending));
}

export function getPendingCities(): { cityId: string; cityName: string }[] {
  try {
    return JSON.parse(localStorage.getItem(PENDING_KEY) || "[]");
  } catch {
    return [];
  }
}
