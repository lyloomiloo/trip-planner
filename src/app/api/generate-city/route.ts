import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const apiKey = process.env.GEMINI_API;
  if (!apiKey) {
    return NextResponse.json(
      { error: "GEMINI_API key not configured" },
      { status: 500 }
    );
  }

  const { cityName } = await request.json();
  if (!cityName || typeof cityName !== "string") {
    return NextResponse.json(
      { error: "cityName is required" },
      { status: 400 }
    );
  }

  const prompt = `You are a travel guide assistant. Given a city name, provide travel information in JSON format. Every field is required — do not leave any empty.

City: "${cityName}"

Here is a complete example for Vienna, Austria. Your response must match this structure exactly — every field filled with real, useful info:

{
  "name": "Vienna",
  "description": "Imperial grandeur meets modern cool. Coffee houses, palaces, and culture.",
  "country": "Austria",
  "countryLabel": "AUSTRIA",
  "language": "German (Austrian)",
  "currency": "EUR (Euro)",
  "transport": "U-Bahn (metro), trams, buses. Buy a 24/48hr Wiener Linien pass. Everything central is walkable.",
  "mustTry": ["Wiener Schnitzel", "Sachertorte at Café Central", "Einspänner coffee (espresso with whipped cream)"],
  "tips": ["Café Central opens at 10AM — queue before", "Ringstrasse is a loop — tram 1 or 2 circles it", "Naschmarkt for street food and cheap lunch"],
  "lat": 48.2082,
  "lng": 16.3738,
  "splitName": ["VIEN", "NA"],
  "mapZoom": 12
}

Now generate the same for "${cityName}". All fields must be filled. For splitName, split the city name into two visually balanced uppercase parts. For lat/lng, provide accurate city center coordinates. For countryLabel, use short labels like SWISS (not SWITZERLAND), FRANCE, AUSTRIA, GERMANY, ITALY, etc.`;

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
      console.error("[generate-city] Gemini API error:", res.status, errText);
      return NextResponse.json(
        { error: `Gemini API error: ${res.status}`, details: errText },
        { status: res.status }
      );
    }

    const data = await res.json();
    const text =
      data?.candidates?.[0]?.content?.parts?.[0]?.text ?? "";

    if (!text) {
      console.error("[generate-city] Empty Gemini response:", JSON.stringify(data));
      return NextResponse.json(
        { error: "Empty response from Gemini" },
        { status: 500 }
      );
    }

    // Strip markdown code fences if present (handle various formats)
    const cleaned = text
      .replace(/^[\s\S]*?```(?:json)?\s*/i, "")
      .replace(/\s*```[\s\S]*$/i, "")
      .trim();

    // Try parsing cleaned first, fall back to raw text
    let parsed;
    try {
      parsed = JSON.parse(cleaned);
    } catch {
      parsed = JSON.parse(text.trim());
    }

    console.log("[generate-city] Success for:", cityName, "→", parsed.country);
    return NextResponse.json(parsed);
  } catch (err) {
    console.error("[generate-city] Parse error:", err);
    return NextResponse.json(
      { error: "Failed to parse Gemini response", details: String(err) },
      { status: 500 }
    );
  }
}
