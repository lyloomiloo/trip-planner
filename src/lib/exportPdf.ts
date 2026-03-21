import html2canvas from "html2canvas-pro";
import { jsPDF } from "jspdf";

/**
 * Build a static map image URL for a given lat/lng.
 * Uses Google Maps Static API if key is set, otherwise OpenStreetMap.
 */
function staticMapUrl(lat: number, lng: number, zoom: number, w: number, h: number): string {
  const gKey = typeof window !== "undefined"
    ? (window as unknown as Record<string, unknown>).__GMAPS_STATIC_KEY__ as string | undefined
    : undefined;

  if (gKey) {
    return `https://maps.googleapis.com/maps/api/staticmap?center=${lat},${lng}&zoom=${zoom}&size=${w}x${h}&scale=2&maptype=roadmap&key=${gKey}`;
  }
  // Free fallback — OpenStreetMap static tiles via staticmap.openstreetmap.de
  return `https://staticmap.openstreetmap.de/staticmap.php?center=${lat},${lng}&zoom=${zoom}&size=${w}x${h}&maptype=mapnik`;
}

/**
 * Replace all Google Maps iframes with static map images before capture.
 * Accepts a cityLookup so we can get accurate lat/lng/zoom.
 */
async function replaceIframesWithStatic(
  container: HTMLElement,
  cityLookup?: Record<string, { lat: number; lng: number; mapZoom: number }>
): Promise<(() => void)[]> {
  const iframes = Array.from(container.querySelectorAll<HTMLIFrameElement>("iframe"));
  const restorers: (() => void)[] = [];

  for (const iframe of iframes) {
    const parent = iframe.parentElement;
    if (!parent) continue;

    const w = iframe.offsetWidth || 600;
    const h = iframe.offsetHeight || 400;

    // Try to find lat/lng from city lookup (match by query param or nearby data attribute)
    let lat = 47.0, lng = 8.0, zoom = 12;
    const src = iframe.src || "";
    const qMatch = src.match(/[?&]q=([^&]+)/);
    const query = qMatch ? decodeURIComponent(qMatch[1]) : "";

    if (cityLookup) {
      // Try matching city name from the query
      for (const [, city] of Object.entries(cityLookup)) {
        if (query.toLowerCase().includes(city.lat.toString().substring(0, 4)) ||
            query.toLowerCase().includes(String(city.lng).substring(0, 4))) {
          lat = city.lat; lng = city.lng; zoom = city.mapZoom;
          break;
        }
      }
      // Also try matching by city name
      for (const [cityId, city] of Object.entries(cityLookup)) {
        const name = (city as Record<string, unknown>).name as string || cityId;
        if (query.toLowerCase().includes(name.toLowerCase())) {
          lat = city.lat; lng = city.lng; zoom = city.mapZoom;
          break;
        }
      }
    }

    // Also try extracting lat/lng directly from embed URL
    const llMatch = src.match(/center=([-\d.]+),([-\d.]+)/);
    if (llMatch) {
      lat = parseFloat(llMatch[1]);
      lng = parseFloat(llMatch[2]);
    }
    const zMatch = src.match(/[?&]z(?:oom)?=(\d+)/);
    if (zMatch) zoom = parseInt(zMatch[1]);

    const imgUrl = staticMapUrl(lat, lng, zoom, Math.min(w, 640), Math.min(h, 640));

    // Pre-load the static map image
    const img = document.createElement("img");
    img.crossOrigin = "anonymous";
    img.style.width = w + "px";
    img.style.height = h + "px";
    img.style.objectFit = "cover";
    img.style.display = "block";

    await new Promise<void>((resolve) => {
      img.onload = () => resolve();
      img.onerror = () => {
        // Fallback to a gray placeholder with city name
        img.style.background = "#e5e5e5";
        img.alt = query || "MAP";
        resolve();
      };
      img.src = imgUrl;
    });

    // Hide iframe, show static image
    const originalDisplay = iframe.style.display;
    iframe.style.display = "none";
    parent.insertBefore(img, iframe);

    restorers.push(() => {
      iframe.style.display = originalDisplay;
      img.remove();
    });
  }

  return restorers;
}

/**
 * Also replace Leaflet map containers (.leaflet-container) with static images.
 */
async function replaceLeafletMaps(
  container: HTMLElement,
  cityLookup?: Record<string, { lat: number; lng: number; mapZoom: number; name?: string }>
): Promise<(() => void)[]> {
  const maps = Array.from(container.querySelectorAll<HTMLElement>(".leaflet-container"));
  const restorers: (() => void)[] = [];

  for (const mapEl of maps) {
    const parent = mapEl.parentElement;
    if (!parent) continue;

    const w = mapEl.offsetWidth || 600;
    const h = mapEl.offsetHeight || 400;

    // Try to find which city this map belongs to by traversing up
    let lat = 47.0, lng = 8.0, zoom = 12;
    const section = mapEl.closest("section");
    if (section && cityLookup) {
      // Check for city name in the section text
      const text = section.textContent?.toLowerCase() || "";
      for (const [, city] of Object.entries(cityLookup)) {
        const name = ((city as Record<string, unknown>).name as string || "").toLowerCase();
        if (name && text.includes(name)) {
          lat = city.lat; lng = city.lng; zoom = city.mapZoom;
          break;
        }
      }
    }

    const imgUrl = staticMapUrl(lat, lng, zoom, Math.min(w, 640), Math.min(h, 640));

    const img = document.createElement("img");
    img.crossOrigin = "anonymous";
    img.style.width = w + "px";
    img.style.height = h + "px";
    img.style.objectFit = "cover";
    img.style.position = "absolute";
    img.style.inset = "0";
    img.style.zIndex = "1";

    await new Promise<void>((resolve) => {
      img.onload = () => resolve();
      img.onerror = () => resolve();
      img.src = imgUrl;
    });

    // Overlay the static image on top of the Leaflet map
    const originalPosition = mapEl.style.position;
    mapEl.style.position = "relative";
    mapEl.appendChild(img);

    restorers.push(() => {
      mapEl.style.position = originalPosition;
      img.remove();
    });
  }

  return restorers;
}

/**
 * Convert cross-origin images to inline data URIs so html2canvas can capture them.
 * Returns a restore function to undo the changes.
 */
async function inlineExternalImages(container: HTMLElement): Promise<() => void> {
  const imgs = Array.from(container.querySelectorAll<HTMLImageElement>("img"));
  const originals: { img: HTMLImageElement; src: string }[] = [];

  await Promise.all(
    imgs.map(async (img) => {
      const src = img.src;
      if (!src || src.startsWith("data:") || src.startsWith("blob:")) return;

      try {
        const res = await fetch(src, { mode: "cors" });
        const blob = await res.blob();
        const dataUri = await new Promise<string>((resolve) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve(reader.result as string);
          reader.readAsDataURL(blob);
        });
        originals.push({ img, src });
        img.src = dataUri;
      } catch {
        // If fetch fails, try via a proxy canvas
        try {
          const c = document.createElement("canvas");
          c.width = img.naturalWidth || img.width || 300;
          c.height = img.naturalHeight || img.height || 200;
          const ctx = c.getContext("2d");
          if (ctx) {
            ctx.drawImage(img, 0, 0);
            const dataUri = c.toDataURL("image/jpeg", 0.9);
            originals.push({ img, src });
            img.src = dataUri;
          }
        } catch {
          // Skip images that can't be inlined
        }
      }
    })
  );

  return () => {
    originals.forEach(({ img, src }) => {
      img.src = src;
    });
  };
}

/**
 * Captures each slide section as a screenshot and assembles them into a landscape PDF.
 * Pass cityLookup to get real map images instead of gray placeholders.
 */
export async function exportSlidesToPdf(
  _containerSelector: string,
  slideSelector: string,
  filename = "itinerary.pdf",
  cityLookup?: Record<string, { lat: number; lng: number; mapZoom: number; name?: string }>
) {
  const slides = document.querySelectorAll<HTMLElement>(slideSelector);
  if (slides.length === 0) return;

  // Set Google Maps Static API key if available
  const gKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_STATIC_KEY || process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
  if (gKey && typeof window !== "undefined") {
    (window as unknown as Record<string, unknown>).__GMAPS_STATIC_KEY__ = gKey;
  }

  // Use a fixed width, let each page's height match the slide's aspect ratio
  const PDF_W = 842; // A4 landscape width in px at 72dpi

  // Hide interactive-only elements
  const allNoPdfEls = Array.from(document.querySelectorAll<HTMLElement>("[data-no-pdf]"));
  allNoPdfEls.forEach((e) => (e.style.display = "none"));

  let pdf: jsPDF | null = null;

  for (let i = 0; i < slides.length; i++) {
    const slide = slides[i];

    // Inline external images so html2canvas can capture them
    const restoreImages = await inlineExternalImages(slide);

    // Replace maps with static images
    const iframeRestorers = await replaceIframesWithStatic(slide, cityLookup);
    const leafletRestorers = await replaceLeafletMaps(slide, cityLookup);

    const prevOverflow = slide.style.overflow;
    slide.style.overflow = "visible";

    const canvas = await html2canvas(slide, {
      scale: 2,
      useCORS: true,
      allowTaint: true,
      logging: false,
      backgroundColor: "#ffffff",
    });

    slide.style.overflow = prevOverflow;

    // Restore everything
    iframeRestorers.forEach((r) => r());
    leafletRestorers.forEach((r) => r());
    restoreImages();

    const imgData = canvas.toDataURL("image/jpeg", 0.92);
    const imgW = canvas.width;
    const imgH = canvas.height;

    // Page height matches the slide's aspect ratio — no whitespace
    const pageH = (imgH / imgW) * PDF_W;

    if (!pdf) {
      pdf = new jsPDF({ orientation: "landscape", unit: "px", format: [PDF_W, pageH] });
    } else {
      pdf.addPage([PDF_W, pageH], "landscape");
    }

    pdf.addImage(imgData, "JPEG", 0, 0, PDF_W, pageH);
  }

  // Restore hidden elements
  allNoPdfEls.forEach((e) => (e.style.display = ""));

  pdf?.save(filename);
}

/**
 * Captures the overview panel as a mobile-friendly PDF.
 */
export async function exportOverviewToPdf(
  overviewSelector: string,
  filename = "trip-overview.pdf"
) {
  const el = document.querySelector<HTMLElement>(overviewSelector);
  if (!el) return;

  const noPdfEls = Array.from(el.querySelectorAll<HTMLElement>("[data-no-pdf]"));
  noPdfEls.forEach((e) => (e.style.display = "none"));

  const canvas = await html2canvas(el, {
    scale: 2,
    useCORS: true,
    allowTaint: true,
    logging: false,
    backgroundColor: "#ffffff",
    scrollY: -window.scrollY,
    windowHeight: el.scrollHeight,
    height: el.scrollHeight,
  });

  noPdfEls.forEach((e) => (e.style.display = ""));

  const imgData = canvas.toDataURL("image/jpeg", 0.92);
  const imgW = canvas.width;
  const imgH = canvas.height;

  const pdf = new jsPDF({
    orientation: "portrait",
    unit: "px",
    format: [imgW / 2, imgH / 2],
  });

  pdf.addImage(imgData, "JPEG", 0, 0, imgW / 2, imgH / 2);
  pdf.save(filename);
}
