import { NextResponse } from "next/server";
import type { TripPreferences, CitySuggestion, GeneratedDay } from "@/types/generation";

export async function POST(request: Request) {
  const apiKey = process.env.GEMINI_API;
  if (!apiKey) {
    return NextResponse.json(
      { error: "GEMINI_API key not configured" },
      { status: 500 }
    );
  }

  const body = await request.json();
  const { step } = body as { step: "cities" | "schedule" | "add-city" };
  const exclude: string[] = body.exclude || [];

  if (step === "cities") {
    return handleCities(apiKey, body.preferences as TripPreferences, exclude);
  } else if (step === "schedule") {
    return handleSchedule(apiKey, body.preferences as TripPreferences, body.cities as CitySuggestion[]);
  } else if (step === "add-city") {
    return handleAddCity(apiKey, body.preferences as TripPreferences, exclude);
  }

  return NextResponse.json({ error: "Invalid step" }, { status: 400 });
}

async function handleCities(apiKey: string, prefs: TripPreferences, exclude: string[]) {
  const prompt = `You are an expert travel planner. Based on the following preferences, suggest cities for an itinerary with transport between them and cost estimates in SGD.

Preferences:
- Region/Destination: ${prefs.region}
- Budget: ${prefs.budget}
- Holiday type: ${prefs.holidayType}
- Duration: ${prefs.duration} days total
- Travellers: ${prefs.travellers}
- Flying from: ${prefs.origin}
- Travel dates: starting ${prefs.startDate} (consider seasonality, weather, and any local festivals/events around this time)
${prefs.otherCriteria ? `- Special requests: ${prefs.otherCriteria}` : ""}

Return a JSON array of city suggestions. Each city object must match this EXACT structure:
{
  "name": "city name",
  "country": "country name",
  "nights": number,
  "reason": "1-2 sentences explaining WHY this city fits",
  "activities": [[{"title": "Morning market walk", "type": "activity"}, {"title": "Lunch at local cafe", "type": "food"}], [{"title": "Temple visit", "type": "activity"}]],
  "transportIn": { "from": "origin city", "to": "this city", "mode": "flight", "durationHrs": 6, "costEstimate": 400 },
  "costEstimate": {
    "accommodation": 200,
    "food": 100,
    "activities": 80,
    "transport": 30
  }
}

CRITICAL rules for activities:
- "activities" is an array of arrays. activities.length MUST equal "nights" exactly.
- activities[0] = list of 2-4 activities for day 1, activities[1] = day 2, etc.
- Each activity is a simple object: { "title": "activity name", "type": "activity|food|rest" }

CRITICAL rules for transport:
- First city: transportIn.from = "${prefs.origin}", mode = "flight"
- Subsequent cities: transportIn connects from the previous city, pick realistic mode (train/bus/flight)
- Include realistic duration in hours and cost in SGD per person

Cost estimates:
- All costs in SGD (Singapore Dollars) per person
- accommodation: total for all nights in that city
- food: total estimated food spend for all days
- activities: entry fees, tours, etc.
- transport: local transport within the city (taxis, metro, etc.)
- Be realistic for the ${prefs.budget} budget level

Other rules:
- Total nights across all cities MUST equal exactly ${prefs.duration}
- Order cities in logical travel sequence (minimize backtracking)
- Suggest 2-5 cities depending on duration
- Match budget: ${prefs.budget === "budget" ? "hostels, street food, free attractions" : prefs.budget === "mid-range" ? "3-4 star hotels, good restaurants, mix of free and paid" : "luxury hotels, fine dining, exclusive experiences"}
- Match holiday type: ${prefs.holidayType}
${exclude.length > 0 ? `- DO NOT suggest any of these cities (already seen): ${exclude.join(", ")}` : ""}
${prefs.otherCriteria ? `- Respect these special requests: ${prefs.otherCriteria}` : ""}`;

  return callGemini(apiKey, prompt);
}

async function handleSchedule(apiKey: string, prefs: TripPreferences, cities: CitySuggestion[]) {
  // Build a rich city summary including transport and planned activities
  const cityDetails = cities.map((c, i) => {
    const transport = c.transportIn
      ? `Transport: ${c.transportIn.mode} from ${c.transportIn.from} (~${c.transportIn.durationHrs}h)`
      : i === 0 ? `Transport: flight from ${prefs.origin}` : "";
    const activities = (c.activities || []).map((dayActs, d) => {
      const acts = (dayActs || []).map((a) => typeof a === "string" ? a : a?.title || "").join(", ");
      return `  Day ${d + 1}: ${acts}`;
    }).join("\n");
    return `${c.name} (${c.country}) — ${c.nights} nights\n${transport}\nPlanned activities:\n${activities}`;
  }).join("\n\n");

  const prompt = `You are an expert travel planner. Generate a detailed day-by-day schedule for this trip. Use the planned activities provided — expand them into timed events with meals and logistics.

Trip details:
- Flying from: ${prefs.origin}
- Budget: ${prefs.budget}
- Holiday type: ${prefs.holidayType}
- Travellers: ${prefs.travellers}
${prefs.otherCriteria ? `- Special requests: ${prefs.otherCriteria}` : ""}

Cities and planned activities:
${cityDetails}

Generate a JSON array of day objects. Total days = ${cities.reduce((s, c) => s + c.nights, 0)} (one entry per day). Each day:
{
  "cityName": "Geneva",
  "route": "SINGAPORE ✈ GENEVA" or "GENEVA 🚌 ANNECY" or just "GENEVA" if staying,
  "accommodation": "Hotel name (realistic for the budget)",
  "events": [
    { "time": "9:00 AM", "title": "Breakfast", "type": "food" },
    { "time": "10:30 AM", "title": "Old Town Walk", "type": "activity", "highlight": true },
    ...
  ]
}

Event types: "transport", "food", "activity", "accommodation", "rest"

CRITICAL — event title rules:
- Titles MUST be 1-5 words maximum. Short and punchy.
- Examples: "Breakfast", "Lake Cruise", "Check-in & Rest", "Flight to Almaty", "Green Bazaar", "Dinner"
- Do NOT write long descriptions. Just the destination or action name.

Other rules:
- Day 1 starts with arrival transport from ${prefs.origin}
- On travel days include transport with emoji (✈ for flights, 🚌 for bus, 🚂 for train, 🚗 for car, ⛴ for ferry)
- Build the schedule around the planned activities listed above
- Include check-in and check-out times
- Include 4-7 events per day
- Match budget: ${prefs.budget === "budget" ? "budget-friendly restaurants, free activities" : prefs.budget === "mid-range" ? "mid-range restaurants, mix of paid/free activities" : "upscale dining, premium experiences"}
- Include meals (breakfast, lunch, dinner)
- Use 12-hour time format (e.g. "9:00 AM", "2:30 PM")
- Set highlight: true for the most notable event each day
- Make accommodation names realistic for the budget level
- Last day should end with departure transport back to ${prefs.origin}`;

  return callGemini(apiKey, prompt);
}

async function handleAddCity(apiKey: string, prefs: TripPreferences, exclude: string[]) {
  // Body also includes existingCities for position context — passed via exclude as city names in order
  const cityRoute = exclude.join(" → ");
  const prompt = `You are an expert travel planner. Suggest ONE additional city to add to an existing itinerary.

Current itinerary route: ${prefs.origin} → ${cityRoute}

Preferences:
- Region/Destination: ${prefs.region}
- Budget: ${prefs.budget}
- Holiday type: ${prefs.holidayType}
- Travellers: ${prefs.travellers}
${prefs.otherCriteria ? `- Special requests: ${prefs.otherCriteria}` : ""}

DO NOT suggest any of these cities: ${exclude.join(", ")}

Choose a city that logistically fits INTO the route (not just at the end). Decide the best position.

Return a single JSON object:
{
  "name": "Lucerne",
  "country": "Switzerland",
  "nights": 2,
  "insertAfterIndex": 1,
  "reason": "Sits perfectly between Zurich and Interlaken on the train route.",
  "activities": [[{"title": "Chapel Bridge walk", "type": "activity"}, {"title": "Lunch at Old Town", "type": "food"}], [{"title": "Mount Pilatus day trip", "type": "activity"}]],
  "transportIn": { "from": "previous city", "to": "Lucerne", "mode": "train", "durationHrs": 2, "costEstimate": 45 },
  "costEstimate": { "accommodation": 200, "food": 120, "activities": 80, "transport": 30 }
}

- "insertAfterIndex": the 0-based index in the current city list after which to insert this city. 0 = after first city, etc. Choose based on geography/logistics.
- activities.length MUST equal nights
- transportIn.from should be the city at insertAfterIndex in the current list
- All costs in SGD per person, realistic for ${prefs.budget} budget`;

  return callGemini(apiKey, prompt);
}

async function callGemini(apiKey: string, prompt: string) {
  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            responseMimeType: "application/json",
          },
        }),
      }
    );

    if (!res.ok) {
      const errText = await res.text();
      console.error("[generate-itinerary] Gemini API error:", res.status, errText);
      return NextResponse.json(
        { error: `Gemini API error: ${res.status}`, details: errText },
        { status: res.status }
      );
    }

    const data = await res.json();
    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text ?? "";

    if (!text) {
      return NextResponse.json(
        { error: "Empty response from Gemini" },
        { status: 500 }
      );
    }

    // Strip markdown code fences if present
    const cleaned = text
      .replace(/^[\s\S]*?```(?:json)?\s*/i, "")
      .replace(/\s*```[\s\S]*$/i, "")
      .trim();

    let parsed;
    try {
      parsed = JSON.parse(cleaned);
    } catch {
      parsed = JSON.parse(text.trim());
    }

    return NextResponse.json(parsed);
  } catch (err) {
    console.error("[generate-itinerary] Error:", err);
    return NextResponse.json(
      { error: "Failed to generate", details: String(err) },
      { status: 500 }
    );
  }
}
