# Europe Alps Tour 2026 — Trip Planner

An editable trip itinerary website. Click to edit any text, search images to fill gallery slots, live weather per destination.

## How It Works

- **All trip data** lives in `data/itinerary.json`
- **Frontend loads it** into React state on mount
- **Click any text** (times, events, captions) to edit inline
- **Click empty image slots** to search and place photos
- **Export JSON** button saves your current state as a file
- **Import JSON** restores from a saved file
- **Weather** auto-fetches from Open-Meteo (free, no key)

## Image Search Setup (pick one — both free, no credit card)

| Provider | Quality | Free Tier | Setup |
|----------|---------|-----------|-------|
| **Unsplash** (recommended) | Best for travel/locations | 50 req/hr | [Sign up](https://unsplash.com/developers) → New Application → copy Access Key |
| Pexels | Good variety | 200 req/hr | [Sign up](https://www.pexels.com/api/) → copy API Key |

Add the key to `.env.local` — the app auto-detects which provider is configured.

> **Note:** Google Custom Search API is closed to new customers as of 2026. That's why we use Unsplash/Pexels instead.

## Tech Stack
- Next.js 14 (App Router)
- Tailwind CSS
- Framer Motion (modal transitions)
- Open-Meteo API (weather, free)
- Unsplash / Pexels API (image search, free)
# trip-planner
