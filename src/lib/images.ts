// src/lib/images.ts

export interface SearchResult {
  id: string;
  url: string;        // display size (~800-1080px)
  thumbUrl: string;   // thumbnail for search grid (~350-400px)
  alt: string;
  source: "Unsplash" | "Pexels";
  photographer?: string;
  photographerUrl?: string;
}

/**
 * Auto-detect which API key is configured and use that provider.
 * Priority: Unsplash (better travel/location photos) → Pexels (higher free rate limit)
 */
export async function searchImages(query: string, count: number = 12): Promise<SearchResult[]> {
  const unsplashKey = process.env.NEXT_PUBLIC_UNSPLASH_ACCESS_KEY;
  const pexelsKey = process.env.NEXT_PUBLIC_PEXELS_API_KEY;

  if (unsplashKey) return searchUnsplash(query, count, unsplashKey);
  if (pexelsKey) return searchPexels(query, count, pexelsKey);

  return [];
}

export function getConfiguredProvider(): string | null {
  if (process.env.NEXT_PUBLIC_UNSPLASH_ACCESS_KEY) return "Unsplash";
  if (process.env.NEXT_PUBLIC_PEXELS_API_KEY) return "Pexels";
  return null;
}

// ─── Unsplash (50 req/hr free, no credit card) ───────────
// Sign up: https://unsplash.com/developers → New Application → copy Access Key
// Requires photographer attribution when displaying images

async function searchUnsplash(
  query: string, count: number, key: string
): Promise<SearchResult[]> {
  try {
    const res = await fetch(
      `https://api.unsplash.com/search/photos?query=${encodeURIComponent(query)}&per_page=${count}&orientation=landscape`,
      { headers: { Authorization: `Client-ID ${key}` } }
    );
    if (!res.ok) return [];
    const data = await res.json();
    return (data.results || []).map((p: any) => ({
      id: p.id,
      url: p.urls.regular,
      thumbUrl: p.urls.small,
      alt: p.alt_description || query,
      source: "Unsplash" as const,
      photographer: p.user.name,
      photographerUrl: `${p.user.links.html}?utm_source=trip_planner&utm_medium=referral`,
    }));
  } catch { return []; }
}

// ─── Pexels (200 req/hr free, no credit card) ────────────
// Sign up: https://www.pexels.com/api/ → copy API Key

async function searchPexels(
  query: string, count: number, key: string
): Promise<SearchResult[]> {
  try {
    const res = await fetch(
      `https://api.pexels.com/v1/search?query=${encodeURIComponent(query)}&per_page=${count}&orientation=landscape`,
      { headers: { Authorization: key } }
    );
    if (!res.ok) return [];
    const data = await res.json();
    return (data.photos || []).map((p: any) => ({
      id: String(p.id),
      url: p.src.large,
      thumbUrl: p.src.medium,
      alt: p.alt || query,
      source: "Pexels" as const,
      photographer: p.photographer,
      photographerUrl: p.photographer_url,
    }));
  } catch { return []; }
}

// ─── Manual URL validation ────────────────────────────────

/**
 * Check if a URL points to a loadable image.
 * Creates a temporary <img> element and waits for load/error.
 */
export function validateImageUrl(url: string): Promise<boolean> {
  return new Promise((resolve) => {
    if (!url || (!url.startsWith("http://") && !url.startsWith("https://"))) {
      resolve(false);
      return;
    }
    const img = new Image();
    img.onload = () => resolve(true);
    img.onerror = () => resolve(false);
    img.src = url;
    setTimeout(() => resolve(false), 8000);
  });
}

// ─── File upload to base64 ────────────────────────────────

/**
 * Convert a File object to a base64 data URI string.
 * Warns if file is larger than maxSizeMB.
 */
export function fileToBase64(
  file: File,
  maxSizeMB: number = 5
): Promise<{ dataUri: string; warning?: string }> {
  return new Promise((resolve, reject) => {
    if (!file.type.startsWith("image/")) {
      reject(new Error("Not an image file"));
      return;
    }
    const warning =
      file.size > maxSizeMB * 1024 * 1024
        ? `Image is ${(file.size / 1024 / 1024).toFixed(1)}MB — consider resizing for better performance`
        : undefined;
    const reader = new FileReader();
    reader.onload = () => resolve({ dataUri: reader.result as string, warning });
    reader.onerror = () => reject(new Error("Failed to read file"));
    reader.readAsDataURL(file);
  });
}
