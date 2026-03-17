import { NextResponse } from "next/server";
import crypto from "crypto";

function getSupabaseConfig() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return { url, key };
}

function hashPassphrase(passphrase: string): string {
  return crypto.createHash("sha256").update(passphrase).digest("hex");
}

function supabaseHeaders(key: string, prefer?: string) {
  const headers: Record<string, string> = {
    apikey: key,
    Authorization: `Bearer ${key}`,
    "Content-Type": "application/json",
  };
  if (prefer) headers["Prefer"] = prefer;
  return headers;
}

export async function POST(request: Request) {
  const config = getSupabaseConfig();
  if (!config) {
    return NextResponse.json(
      { error: "Supabase not configured" },
      { status: 501 }
    );
  }

  try {
    const { id, passphrase, meta, data } = await request.json();

    if (!id || !passphrase) {
      return NextResponse.json(
        { error: "id and passphrase are required" },
        { status: 400 }
      );
    }

    const passphrase_hash = hashPassphrase(passphrase);

    // Check if trip already exists by ID
    const checkRes = await fetch(
      `${config.url}/rest/v1/trips?id=eq.${encodeURIComponent(id)}&select=id`,
      { headers: supabaseHeaders(config.key) }
    );

    if (!checkRes.ok) {
      const errText = await checkRes.text();
      console.error("[trips] Supabase check error:", checkRes.status, errText);
      return NextResponse.json(
        { error: "Failed to check existing trip", details: errText },
        { status: checkRes.status }
      );
    }

    const existing = await checkRes.json();
    if (existing.length > 0) {
      return NextResponse.json(
        { error: "A trip with this ID already exists" },
        { status: 409 }
      );
    }

    // Also check passphrase hash isn't already used
    const hashCheck = await fetch(
      `${config.url}/rest/v1/trips?passphrase_hash=eq.${passphrase_hash}&select=id`,
      { headers: supabaseHeaders(config.key) }
    );
    if (hashCheck.ok) {
      const hashExisting = await hashCheck.json();
      if (hashExisting.length > 0) {
        return NextResponse.json(
          { error: "This passphrase is already in use — choose a different one" },
          { status: 409 }
        );
      }
    }

    // Insert new trip
    const insertRes = await fetch(`${config.url}/rest/v1/trips`, {
      method: "POST",
      headers: supabaseHeaders(config.key, "return=representation"),
      body: JSON.stringify({
        id,
        passphrase_hash,
        meta: meta || {},
        data: data || {},
      }),
    });

    if (!insertRes.ok) {
      const errText = await insertRes.text();
      console.error("[trips] Supabase insert error:", insertRes.status, errText);
      return NextResponse.json(
        { error: "Failed to create trip", details: errText },
        { status: insertRes.status }
      );
    }

    const inserted = await insertRes.json();
    console.log("[trips] Created trip:", id);
    return NextResponse.json(
      { id: inserted[0]?.id, meta: inserted[0]?.meta },
      { status: 201 }
    );
  } catch (err) {
    console.error("[trips] POST error:", err);
    return NextResponse.json(
      { error: "Failed to create trip", details: String(err) },
      { status: 500 }
    );
  }
}

/** GET /api/trips?passphrase=xxx — look up trip by passphrase */
export async function GET(request: Request) {
  const config = getSupabaseConfig();
  if (!config) {
    return NextResponse.json(
      { error: "Supabase not configured" },
      { status: 501 }
    );
  }

  try {
    const { searchParams } = new URL(request.url);
    const passphrase = searchParams.get("passphrase");

    if (!passphrase) {
      return NextResponse.json(
        { error: "passphrase query parameter is required" },
        { status: 400 }
      );
    }

    const hash = hashPassphrase(passphrase);

    const res = await fetch(
      `${config.url}/rest/v1/trips?passphrase_hash=eq.${hash}&select=id,meta,data`,
      { headers: supabaseHeaders(config.key) }
    );

    if (!res.ok) {
      const errText = await res.text();
      console.error("[trips] Supabase lookup error:", res.status, errText);
      return NextResponse.json(
        { error: "Failed to look up trip", details: errText },
        { status: res.status }
      );
    }

    const trips = await res.json();
    if (trips.length === 0) {
      return NextResponse.json(
        { error: "No trip found for this passphrase" },
        { status: 404 }
      );
    }

    const trip = trips[0];
    return NextResponse.json({
      id: trip.id,
      meta: trip.meta,
      data: trip.data,
    });
  } catch (err) {
    console.error("[trips] GET error:", err);
    return NextResponse.json(
      { error: "Failed to look up trip", details: String(err) },
      { status: 500 }
    );
  }
}
