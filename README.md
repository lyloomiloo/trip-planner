### Overview

PlanMyTrip is an interactive trip planning web application built with **Next.js 14** (App Router). It presents itineraries as a vertical scroll of full-width "slide" sections (cover, city intros, day cards), with inline editing, image search, live weather, AI trip generation, PDF export, and optional cloud sync via Supabase.

---

### Tech Stack
```
| Layer | Technology |
| --- | --- |
| Framework | Next.js 14 (App Router) |
| Language | TypeScript |
| Styling | Tailwind CSS + custom design tokens |
| State | `useReducer` via custom useItinerary hook |
| Maps | Google Maps JavaScript API (CoverMap.tsx), Google Maps embed iframes (city intros) |
| Weather | Open-Meteo API (free, no key) |
| Image Search | Unsplash or Pexels API (auto-detected by env key) |
| AI Generation | Gemini 2.5 Flash (via server-side API routes) |
| PDF Export | html2canvas-pro + jsPDF |
| Persistence | localStorage (primary), Supabase (optional cloud sync) |
| Animations | Framer Motion |
```
---

### Project Structure
```
europe-alps-tour/
├── src/
│   ├── app/
│   │   ├── page.tsx                    # Main entry — view router (landing/new/manual/ai/trip)
│   │   ├── layout.tsx                  # Root layout (fonts: DM Sans, DM Mono, Playfair Display)
│   │   ├── globals.css                 # Global styles + CSS variables
│   │   ├── share/[id]/page.tsx         # View-only share page (locked, no editing)
│   │   └── api/
│   │       ├── generate-city/route.ts  # Gemini → city details (description, tips, coords)
│   │       ├── generate-itinerary/route.ts  # Gemini → full itinerary (cities + schedule)
│   │       ├── proxy-image/route.ts    # Server-side CORS proxy for PDF image inlining
│   │       └── trips/
│   │           ├── route.ts            # POST: create trip, GET: lookup by passphrase
│   │           └── [id]/
│   │               ├── route.ts        # GET: load trip, PUT: update (passphrase-gated)
│   │               └── verify/route.ts # GET: verify passphrase
│   ├── components/
│   │   ├── LandingPage.tsx             # Trip selector + "Continue Plan" list
│   │   ├── NewTripForm.tsx             # Manual trip creation (destinations + nights)
│   │   ├── AITripWizard.tsx            # AI-powered trip generation wizard (multi-step)
│   │   ├── CoverSlide.tsx              # Cover slide — grayscale map + scattered title text
│   │   ├── CoverMap.tsx                # Google Maps JS API w/ red pins, fitBounds, grayscale
│   │   ├── CityIntroSlide.tsx          # City intro — split layout (info + map + overlay text)
│   │   ├── CityMap.tsx                 # Embedded Google Maps iframe for city intros
│   │   ├── DaySlide.tsx                # Day card — weather + gallery + schedule
│   │   ├── WeatherWidget.tsx           # Weather display (temp, sunrise/sunset, emoji)
│   │   ├── Schedule.tsx                # Schedule event list (times + titles, drag reorder)
│   │   ├── GallerySlot.tsx             # Single image slot (empty placeholder or filled image)
│   │   ├── ImageGallery.tsx            # Asymmetric gallery grid (3-5 slots)
│   │   ├── ImageSearchModal.tsx        # 3-tab modal: Search / Paste URL / Upload
│   │   ├── ColorPicker.tsx             # Event color customization
│   │   ├── CommentBubble.tsx           # Inline comments on slides
│   │   ├── EditableText.tsx            # Click-to-edit single-line text
│   │   ├── EditableTextarea.tsx        # Click-to-edit multiline text
│   │   ├── Toolbar.tsx                 # Sticky top toolbar (share, export, undo/redo, lock)
│   │   ├── SlideIndex.tsx              # Right-edge scroll navigation (cover/city/day dots)
│   │   ├── Overview.tsx                # Full-screen overview modal (reorder days/cities)
│   │   ├── PassphraseModal.tsx         # Passphrase set/verify modal for cloud sync
│   │   ├── Toast.tsx                   # Notification toast
│   │   └── MapPins.tsx                 # (dead code per CLAUDE.md)
│   ├── hooks/
│   │   ├── useItinerary.ts             # Core state management (reducer + undo/redo + auto-save)
│   │   ├── useWeather.ts               # Weather data fetcher with in-memory cache
│   │   ├── useImageSearch.ts           # Image search hook (Unsplash/Pexels)
│   │   └── useItineraryGenerator.ts    # AI generation wizard state machine
│   ├── lib/
│   │   ├── tripStore.ts                # localStorage CRUD for trips + passphrase storage
│   │   ├── supabaseSync.ts             # Client-side Supabase operations (via API routes)
│   │   ├── gemini.ts                   # Gemini city detail generator + retry queue
│   │   ├── weather.ts                  # Open-Meteo API (forecast + historical fallback)
│   │   ├── images.ts                   # Image search (Unsplash/Pexels) + URL validation + upload
│   │   └── exportPdf.ts               # PDF export (html2canvas + jsPDF, iframe/Leaflet replacement)
│   └── types/
│       ├── itinerary.ts                # Core data types (ItineraryData, DayData, CityData, etc.)
│       └── generation.ts               # AI generation types (TripPreferences, CitySuggestion, etc.)
├── data/
│   └── itinerary.json                  # Bundled default itinerary (Europe Alps Tour)
├── supabase-schema.sql                 # Supabase table DDL
├── .env.example                        # Environment variable template
├── next.config.js                      # Next.js config (Unsplash/Pexels image domains)
├── tailwind.config.ts                  # Tailwind config (custom fonts, colors, design tokens)
└── package.json
```
---

### Core Data Model

Defined in itinerary.ts:
```
ItineraryData
├── tripTitle: string[]          # ["EUROPE", "ALPS", "TOUR", "2026"]
├── travellers: number
├── origin: string               # "Singapore"
├── cities: Record<string, CityData>
│   └── CityData
│       ├── name, splitName, country, countryLabel
│       ├── lat, lng, mapZoom
│       ├── description, language, currency, transport
│       └── mustTry[], tips[]
├── days: DayData[]
│   └── DayData
│       ├── dayNumber, date, weekday, cityId
│       ├── route, accommodation
│       ├── isCityIntro?: boolean      # true = city intro slide (not a day)
│       ├── weatherLat/Lng/CityName    # per-day weather overrides
│       ├── events: ScheduleEvent[]
│       │   └── time, title, type, highlight, textColor, highlightColor
│       └── gallery: GallerySlot[]
│           └── url, caption, size, slot, source, attribution
└── comments?: Comment[]
```
The `days` array is a flat list mixing city-intro entries (`isCityIntro: true`) and actual day cards. City intros are auto-inserted by `ensureCityIntros()` on first load of bundled data.

---

### State Management — useItinerary.ts

Central `useReducer` with **41 action types** covering all mutations: events, gallery slots, days, cities, comments, titles, weather overrides, reordering, and city block moves.

Key features:

- **Undo/redo**: Maintains a history stack (max 50 snapshots, debounced at 3s). Last 10 snapshots persisted to localStorage. Keyboard shortcut: Cmd/Ctrl+Z / Cmd/Ctrl+Shift+Z.
- **Auto-save**: Every state change instantly saves to localStorage. If Supabase is configured with a passphrase, debounced sync (2s) pushes to cloud.
- **Day renumbering**: `renumberDays()` cascades dates and day numbers when days are added/removed/reordered.

---

### API Routes

| Route | Method | Purpose |
| --- | --- | --- |
| `/api/generate-city` | POST | Gemini 2.5 Flash: generates city travel info (description, tips, coords, splitName) |
| `/api/generate-itinerary` | POST | Gemini 2.5 Flash: 3 steps -- `cities` (suggest route), `schedule` (day-by-day), `add-city` (insert one) |
| `/api/proxy-image` | GET | Server-side CORS proxy for external images (used by PDF export) |
| `/api/trips` | POST/GET | Create trip in Supabase / Lookup trip by passphrase |
| `/api/trips/[id]` | GET/PUT | Load trip / Update trip (passphrase-verified via SHA-256 hash) |
| `/api/trips/[id]/verify` | GET | Verify passphrase against stored hash |

---

### External APIs

| API | Purpose | Auth | Rate Limit |
| --- | --- | --- | --- |
| **Open-Meteo** | Weather (forecast + historical) | None | Free, unlimited |
| **Unsplash** | Image search | `NEXT_PUBLIC_UNSPLASH_ACCESS_KEY` | 50 req/hr |
| **Pexels** | Image search (fallback) | `NEXT_PUBLIC_PEXELS_API_KEY` | 200 req/hr |
| **Google Maps JS API** | Cover map (grayscale + pins) | `NEXT_PUBLIC_GOOGLE_MAPS_STATIC_KEY` | Pay-as-you-go |
| **Gemini 2.5 Flash** | City detail generation + itinerary AI | `GEMINI_API` (server-side) | Rate-limited, auto-retry with backoff |
| **Nominatim (OSM)** | Geocoding (city name -> lat/lng) | None | Free |
| **Supabase** | Cloud trip storage + sharing | `SUPABASE_SERVICE_ROLE_KEY` | Free tier |

---

### Environment Variables

`# Required for maps
NEXT_PUBLIC_GOOGLE_MAPS_STATIC_KEY=     # Google Maps JS + Static Maps API

# Image search (pick one)
NEXT_PUBLIC_UNSPLASH_ACCESS_KEY=        # Unsplash (recommended)
NEXT_PUBLIC_PEXELS_API_KEY=             # Pexels (alternative)

# AI generation
GEMINI_API=                             # Gemini 2.5 Flash (server-side only)

# Cloud sync (optional)
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=`

---

### Key Architectural Patterns

1. **Flat slide list**: Days and city-intros coexist in a single `days[]` array. City intros have `isCityIntro: true` and `dayNumber: 0`. The main page builds a `flatSlides` list from this for rendering.
2. **Gemini retry queue**: When rate-limited, cities are queued in localStorage (`gemini_pending_cities`). A 45s interval retries them automatically. Client-side retry with exponential backoff (up to 5 attempts per city).
3. **PDF export pipeline**: `exportSlidesToPdf()` replaces iframes and Leaflet maps with static images, inlines external images as base64 (via CORS fetch or server proxy), captures each `[data-slide]` element with html2canvas-pro, and assembles into a landscape PDF with per-page aspect ratios.
4. **Passphrase-based auth**: Cloud trips are protected by a user-chosen passphrase. The server stores a SHA-256 hash. Read is public (for share links); write requires matching the hash. No user accounts needed.
5. **Lock mode**: `locked` state disables all editing handlers. Share page (`/share/[id]`) is permanently locked. Main page has a toggle in the toolbar.
6. **Multi-trip persistence**: `tripStore.ts` manages a `trip-planner-trips` key in localStorage containing all saved trips with metadata (title, dates, city names, last updated).

---

### Supabase Schema
```
CREATE TABLE trips (
  id TEXT PRIMARY KEY,
  passphrase_hash TEXT NOT NULL,
  meta JSONB NOT NULL DEFAULT '{}',
  data JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
```
-- RLS: public read, service-role-only write

---

### Design Tokens

**Fonts**: `Playfair Display` (serif headings), `DM Sans` (display/body), `DM Mono` (monospace body)

**Colors**: `--text: #2D2D2D`, `--text-light: #888`, `--accent-gold: #C4973B` (food), `--accent-blue: #4A7C9B` (transport), `--accent-green: #8B9D83` (activity), `--accent-purple: #8B7B9B` (accommodation), `--accent-gray: #D0D0D0` (rest)
