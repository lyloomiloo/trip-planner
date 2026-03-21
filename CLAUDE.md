# CLAUDE.md — Europe Alps Tour 2026: Trip Planning Tool

## What This Is

A **personal trip planning tool** — NOT a polished display website. The primary user is the trip planner who needs to:
1. Edit schedule items, times, and captions inline by clicking on them
2. Search for location images (Google Images / Unsplash) and click to place them into gallery slots
3. See live weather data for each day's destination
4. Export or screenshot sections that look like their existing Keynote design

The design must faithfully reproduce the layout from the reference screenshots (described below). This is a tool that also happens to look good.

---

## Design: Match the Keynote Exactly

### Page Structure (vertical scroll, slide-like sections)

The page is a single vertical scroll of full-width "slide" sections. The order is:

1. **Cover slide** — Grayscale map background spanning Geneva to Vienna, with red pins at each city. Overlaid text: "EUROPE" (top-left), "ALPS" (center-right), "TOUR" (bottom-left), "2026" (bottom-right) — all in massive black serif type, loosely scattered across the map. Not centered, not aligned — deliberately offset like the reference.

2. **For each city visited**, repeat this pair:
   - **City intro slide** — Split layout. Left ~30%: city name, country, weather info, quick facts, accommodation. Right ~70%: embedded Google Map of the city. Overlaid on the map in massive black sans-serif type: the city name split into parts (e.g. "GEN" top-left, "EVA" top-right, "SWISS" bottom-right). These text overlays are bold, huge, and partially cover the map — they're decorative, not functional labels.
   - **Day slide(s)** — One per day spent in this city. Layout described below.

### Day Slide Layout (THE KEY LAYOUT — match exactly)

Each day slide is a single full-width section with this structure:

```
┌──────────────────────────────────────────────────────────────────────┐
│  [26]  Rise  6:28 AM                              DAY 1            │
│  [☁️]   Set  6:56 PM                              26 MAR, THURSDAY │
│  12°                                    SINGAPORE ✈ GENEVA          │
│   1°                                                                │
│         ┌────────────────┬──────────────┐                           │
│         │                │              │   12:05 AM  Flight SIN-T2 │
│         │   IMAGE A      │   IMAGE B    │   8:05AM    Land at GEN   │
│         │   (large)      │   (medium)   │   9:00AM    Leave luggage │
│         │                │              │   10:30     Brunch @      │
│         ├────────┬───────┤  CAPTION B   │             Cottage Cafe  │
│         │ IMG C  │ IMG D │              │   12:00PM   Geneva Lake   │
│         │ (med)  │ (sm)  ├──────────────┤   2:00PM    Check-in     │
│         │        │       │              │   4:00PM    Old Town      │
│         │CAPTION │       │   IMAGE E    │   7:00PM    Dinner       │
│         │   C    │       │   (large)    │                           │
│         └────────┴───────┤              │                           │
│                          │              │                           │
│                          └──────────────┘                           │
└──────────────────────────────────────────────────────────────────────┘
```

Key design details:
- **Weather widget** (top-left): Date number, weather emoji, "Rise" time, "Set" time, high°/low° — small, understated, gray text
- **Day header** (top-right): "DAY 1" in massive bold serif, date + weekday below, route below that — all right-aligned
- **Image gallery** (left ~60%): Asymmetric grid of 3-5 images. Images are different sizes (large, medium, small). Some have bold black captions below them (e.g. "SPRING BLOOMS", "BRUNCH @ COTTAGE CAFE"). Empty slots show a dashed border with a "+" icon and "Search images..." placeholder
- **Schedule** (right ~40%): Simple two-column layout. Left column: bold times. Right column: event descriptions, right-aligned. No borders, no cards, no icons — just clean type. Highlighted events get a subtle warm tint.

### Typography
- Display/headings: `'Playfair Display', serif` — for DAY numbers, city names, cover text
- Body/schedule: `'DM Sans', sans-serif` — for times, descriptions, captions
- Captions: `'DM Sans', sans-serif` — bold, uppercase, tracking wide
- City name overlays on maps: Bold, black, enormous (8-12vw), sans-serif

### Colors
```css
--bg: #FFFFFF;
--text: #2D2D2D;
--text-light: #888888;
--accent-gold: #C4973B;    /* food events, highlights */
--accent-blue: #4A7C9B;    /* transport events */
--accent-green: #8B9D83;   /* activity events */
--accent-purple: #8B7B9B;  /* accommodation */
--accent-gray: #D0D0D0;    /* rest, dividers */
--slot-empty: #F5F5F5;     /* empty image slot background */
--slot-border: #DDDDDD;    /* dashed border on empty slots */
```

---

## Interactive Features (THE PLANNING TOOL PART)

### 1. Inline Editing (click-to-edit everything)

Every text element in the schedule and gallery is editable:
- **Event times**: Click → input field → type new time → click away to save
- **Event titles**: Click → input field → edit text → click away to save
- **Image captions**: Click → input field → edit → save
- **Day route text**: Click → edit
- **Accommodation name**: Click → edit

Visual cue: Editable text gets a subtle underline-on-hover (dotted, light gray) to hint that it's clickable. Active editing shows a clean input with no heavy border — just an underline.

All edits save to a React state that mirrors the JSON structure. Include an "Export JSON" button in a floating toolbar that downloads the current state as `itinerary.json`. Also include "Import JSON" to load a saved file.

### 2. Image Search & Placement

This is the core feature. When the user clicks an empty gallery slot (or clicks a small 🔍 icon on an existing image):

1. A **search modal** opens with a text input
2. User types a location/query (e.g. "Geneva lake spring", "Cottage Cafe Geneva")
3. The app fetches image results and displays them as a grid of thumbnails
4. User clicks a thumbnail → it fills that gallery slot
5. Modal closes, image appears in the slot

**Image sources** (in priority order):
- **Unsplash API** (recommended — best travel/location photos, 50 req/hr free, no credit card): `https://api.unsplash.com/search/photos?query={query}&orientation=landscape`
- **Pexels API** (backup — 200 req/hr free, good variety): `https://api.pexels.com/v1/search?query={query}&orientation=landscape`

The app checks which API key is configured in `.env.local` and uses that one. If none is configured, show a setup prompt with signup links. Note: Unsplash requires photographer attribution on displayed images — show a small "Photo by [name]" overlay on hover.

**Image slot behavior:**
- Empty slot: Shows dashed border, "+" icon, and faint "Click to search images" text
- Filled slot: Shows the image, with a small overlay on hover showing 🔍 (re-search), 🔗 (paste URL), and ✕ (remove) icons
- Images are stored as URLs in the state (either API URLs or pasted URLs or base64 data URIs for uploads)

### 2b. Manual Image Input (fallback when search fails)

The image search modal should have **three tabs** at the top:

1. **Search** (default) — the API-powered search described above
2. **Paste URL** — a text input where the user pastes any image URL (from Google Images, a blog, etc). Show a live preview below the input. Click "Use this image" to place it.
3. **Upload** — a drag-and-drop zone / file picker. User drops or selects a local image file. Convert to base64 data URI and store inline. Show a preview before confirming.

The tab bar should be simple: `[ 🔍 Search  |  🔗 Paste URL  |  📁 Upload ]`

**Paste URL tab details:**
- Single text input with placeholder "Paste an image URL..."
- As the user types/pastes, show a live `<img>` preview below (with error handling — if the URL is broken, show "Couldn't load image" with a red border)
- "Use this image" button below the preview, only enabled when the preview loads successfully
- This is the fastest workflow for Google Images: right-click → Copy Image Address → paste here

**Upload tab details:**
- Drag-and-drop zone with dashed border, "Drop image here or click to browse" text
- Also a standard file input (accept="image/*")
- On file select, use FileReader to convert to base64 data URI
- Show preview of the uploaded image
- "Use this image" button to confirm
- Warn if file is >5MB (suggest resizing)
- Store the base64 string as the `url` value in the gallery slot

**Important**: The filled image slot's hover overlay should also show a 🔗 icon (in addition to 🔍 and ✕) that opens the modal directly on the "Paste URL" tab — this is a shortcut for quick replacements without going through search.

### 3. Live Weather

For each day, fetch weather from **Open-Meteo** (free, no API key):
```
https://api.open-meteo.com/v1/forecast?latitude={lat}&longitude={lng}&daily=temperature_2m_max,temperature_2m_min,weathercode,sunrise,sunset&timezone=auto&start_date={date}&end_date={date}
```

Display in the weather widget: date number, weather emoji, rise/set times, high°/low°.

For dates outside the 16-day forecast window, use the historical API with the previous year's data for the same date as a rough estimate.

### 4. Add/Remove Events

Each day's schedule should have:
- A small "+" button at the bottom to add a new event row
- Each event row has a subtle "✕" on hover to delete it
- Events can be reordered by drag-and-drop (use a simple drag handle on the left)

### 5. Add/Remove Gallery Slots

- "+" button after the last image slot to add a new empty slot
- "✕" overlay on hover to remove a slot
- Gallery slots can be resized: click a small size toggle (S/M/L) on hover

### 6. Floating Toolbar

A small fixed toolbar in the bottom-right corner:
- **Export JSON**: Downloads current state as `itinerary.json`
- **Import JSON**: Upload a file to load
- **Add Day**: Appends a new blank day
- **Reset**: Reloads from the original JSON file

---

## Tech Stack

- **Next.js 14** (App Router)
- **Tailwind CSS** — utility classes for layout
- **React state + useReducer** — itinerary data mutations via `useItinerary`
- **Google Maps JavaScript API** — cover map (grayscale + red pins via `CoverMap.tsx`), city intro maps (embed iframes)
- **Open-Meteo API** — weather (free, no key)
- **Unsplash / Pexels API** — image search (user provides free key)
- **html2canvas-pro + jsPDF** — PDF export
- **Supabase** (optional) — remote trip sync + sharing

---

## Code Principles

**Keep it simple. Keep it structured. Keep it elegant.**

1. **Simplicity first** — prefer the straightforward solution. Don't add abstractions, wrappers, or indirection unless there's a concrete reason. Three similar lines > one premature helper.
2. **One responsibility per file** — each component does one thing. `CoverMap` renders the map. `MapPins` is dead code (remove if found). `CoverSlide` composes them.
3. **Let the platform do the work** — use Google Maps JS API for pin placement (not CSS overlays). Use `fitBounds()` for zoom (not hardcoded values). Use `styles: [{saturation: -100}]` for grayscale (not CSS filters that also gray out pins).
4. **Dynamic over hardcoded** — the cover map auto-fits to whatever cities exist in the data. Don't hardcode lat/lng bounds, zoom levels, or viewport calculations. New itineraries with different cities should just work.
5. **No dead code** — if something is replaced, delete the old version. Don't leave unused components, commented-out blocks, or backwards-compat shims.
6. **Minimal diff** — when fixing a bug, change only what's broken. Don't refactor surrounding code, add types to unchanged functions, or "improve" things that aren't part of the task.

---

## Architecture Notes

### Cover Map (`CoverMap.tsx`)
- Uses **Google Maps JavaScript API** (not embed iframe, not Leaflet, not Static Maps)
- `google.maps.Marker` with custom red SVG pin icon
- `map.fitBounds()` auto-zooms to show all cities with padding
- `styles: [{saturation: -100}]` for native grayscale (keeps pins in color)
- Loaded via `dynamic(() => import("./CoverMap"), { ssr: false })`
- API key: `NEXT_PUBLIC_GOOGLE_MAPS_STATIC_KEY` (also enabled for Maps JS API)

### PDF Export (`exportPdf.ts`)
- Each PDF page matches the slide's exact aspect ratio (no whitespace)
- Replaces iframes/Leaflet maps with static images before capture
- Available on both main page and share page (view-only)

### Share Page (`/share/[id]`)
- View-only: all slides render with `locked={true}`, no editing handlers
- Has Overview + Download PDF buttons (no edit capabilities)
- Loads from localStorage or Supabase

---

## Environment Variables (.env.local)

```bash
# Google Maps (enable both Static Maps API and Maps JavaScript API)
NEXT_PUBLIC_GOOGLE_MAPS_STATIC_KEY=

# Image search — pick one:
NEXT_PUBLIC_UNSPLASH_ACCESS_KEY=
NEXT_PUBLIC_PEXELS_API_KEY=

# Weather: Open-Meteo (free, no key needed)

# Optional: Supabase for remote sync
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
```
