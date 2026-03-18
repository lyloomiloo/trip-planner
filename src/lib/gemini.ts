import type { CityData } from "@/types/itinerary";

export type GenerateResult =
  | { status: "ok"; data: Partial<CityData> }
  | { status: "rate-limited" }
  | { status: "error" };

const MAX_RETRIES = 5;

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
        // Parse retry delay from response if available
        let waitSec = Math.min(20 * (attempt + 1), 90);
        try {
          const body = await res.json();
          const match = body.details?.match(/retryDelay.*?(\d+)s/);
          if (match) waitSec = Math.max(parseInt(match[1]) + 5, waitSec);
        } catch { /* use default */ }
        console.warn(
          `[gemini] Rate limited for "${cityName}", retrying in ${waitSec}s (attempt ${attempt + 1}/${MAX_RETRIES})`
        );
        await new Promise((r) => setTimeout(r, waitSec * 1000));
        continue;
      }

      if (!res.ok) {
        console.error("[gemini] API error for", cityName, "status:", res.status);
        return { status: "error" };
      }

      const data = await res.json();
      console.log("[gemini] Got details for", cityName, ":", data.country);
      return { status: "ok", data };
    } catch (err) {
      console.error("[gemini] Fetch error for", cityName, ":", err);
      if (attempt < MAX_RETRIES - 1) {
        await new Promise((r) => setTimeout(r, 10_000));
        continue;
      }
      return { status: "error" };
    }
  }

  console.warn("[gemini] All retries exhausted for", cityName, "— will retry on next cycle");
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
