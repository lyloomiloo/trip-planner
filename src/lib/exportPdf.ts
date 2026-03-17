import html2canvas from "html2canvas-pro";
import { jsPDF } from "jspdf";

/**
 * Replace all iframes with a static placeholder before capture,
 * then restore them after.
 */
async function replaceIframesWithStatic(container: HTMLElement): Promise<(() => void)[]> {
  const iframes = Array.from(container.querySelectorAll<HTMLIFrameElement>("iframe"));
  const restorers: (() => void)[] = [];

  for (const iframe of iframes) {
    const parent = iframe.parentElement;
    if (!parent) continue;

    // Extract city/location from the iframe src
    const src = iframe.src || "";
    const qMatch = src.match(/[?&]q=([^&]+)/);
    const query = qMatch ? decodeURIComponent(qMatch[1]) : "";

    // Create a placeholder div with the same dimensions showing the city name
    const placeholder = document.createElement("div");
    placeholder.style.width = iframe.offsetWidth + "px";
    placeholder.style.height = iframe.offsetHeight + "px";
    placeholder.style.background = "#e5e5e5";
    placeholder.style.display = "flex";
    placeholder.style.alignItems = "center";
    placeholder.style.justifyContent = "center";
    placeholder.style.position = "relative";

    const fallbackText = document.createElement("div");
    fallbackText.style.cssText = "position:absolute;inset:0;display:flex;align-items:center;justify-content:center;font-size:24px;font-weight:900;color:#999;text-transform:uppercase;letter-spacing:0.1em;";
    fallbackText.textContent = query || "MAP";

    placeholder.appendChild(fallbackText);

    // Hide iframe, show placeholder
    const originalDisplay = iframe.style.display;
    iframe.style.display = "none";
    parent.insertBefore(placeholder, iframe);

    restorers.push(() => {
      iframe.style.display = originalDisplay;
      placeholder.remove();
    });
  }

  return restorers;
}

/**
 * Captures each slide section as a screenshot and assembles them into a landscape PDF.
 */
export async function exportSlidesToPdf(
  containerSelector: string,
  slideSelector: string,
  filename = "itinerary.pdf"
) {
  const slides = document.querySelectorAll<HTMLElement>(slideSelector);
  if (slides.length === 0) return;

  // Landscape A4-ish proportions
  const pdf = new jsPDF({ orientation: "landscape", unit: "px", format: "a4" });
  const pageW = pdf.internal.pageSize.getWidth();
  const pageH = pdf.internal.pageSize.getHeight();

  for (let i = 0; i < slides.length; i++) {
    const slide = slides[i];

    // Replace iframes with static placeholders
    const restorers = await replaceIframesWithStatic(slide);

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

    // Restore iframes
    restorers.forEach((r) => r());

    const imgData = canvas.toDataURL("image/jpeg", 0.92);
    const imgW = canvas.width;
    const imgH = canvas.height;

    const ratio = Math.min(pageW / imgW, pageH / imgH);
    const w = imgW * ratio;
    const h = imgH * ratio;
    const x = (pageW - w) / 2;
    const y = (pageH - h) / 2;

    if (i > 0) pdf.addPage();
    pdf.addImage(imgData, "JPEG", x, y, w, h);
  }

  pdf.save(filename);
}

/**
 * Captures the overview panel as a mobile-friendly PDF.
 * Hides interactive elements (data-no-pdf) before capture.
 */
export async function exportOverviewToPdf(
  overviewSelector: string,
  filename = "trip-overview.pdf"
) {
  const el = document.querySelector<HTMLElement>(overviewSelector);
  if (!el) return;

  // Hide interactive-only elements before capture
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

  // Restore hidden elements
  noPdfEls.forEach((e) => (e.style.display = ""));

  const imgData = canvas.toDataURL("image/jpeg", 0.92);
  const imgW = canvas.width;
  const imgH = canvas.height;

  // Portrait phone-like aspect ratio
  const pdf = new jsPDF({
    orientation: "portrait",
    unit: "px",
    format: [imgW / 2, imgH / 2],
  });

  pdf.addImage(imgData, "JPEG", 0, 0, imgW / 2, imgH / 2);
  pdf.save(filename);
}
