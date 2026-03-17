import html2canvas from "html2canvas-pro";
import { jsPDF } from "jspdf";

/**
 * Captures each slide section as a screenshot and assembles them into a landscape PDF.
 * @param containerSelector CSS selector for the scrollable main element
 * @param slideSelector CSS selector for each slide section to capture
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

    // Temporarily make slide visible for capture (in case of overflow:hidden)
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

    const imgData = canvas.toDataURL("image/jpeg", 0.92);
    const imgW = canvas.width;
    const imgH = canvas.height;

    // Scale to fit page
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
 * Captures just the overview panel as a PDF.
 */
export async function exportOverviewToPdf(
  overviewSelector: string,
  filename = "trip-overview.pdf"
) {
  const el = document.querySelector<HTMLElement>(overviewSelector);
  if (!el) return;

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

  const imgData = canvas.toDataURL("image/jpeg", 0.92);
  const imgW = canvas.width;
  const imgH = canvas.height;

  // Portrait, fit width
  const pdf = new jsPDF({
    orientation: imgW > imgH ? "landscape" : "portrait",
    unit: "px",
    format: [imgW / 2, imgH / 2],
  });

  pdf.addImage(imgData, "JPEG", 0, 0, imgW / 2, imgH / 2);
  pdf.save(filename);
}
