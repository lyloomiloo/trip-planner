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

    // Check if trip already exists
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
    const idsParam = searchParams.get("ids");

    if (!idsParam) {
      return NextResponse.json(
        { error: "ids query parameter is required" },
        { status: 400 }
      );
    }

    const ids = idsParam.split(",").map((id) => id.trim()).filter(Boolean);
    if (ids.length === 0) {
      return NextResponse.json(
        { error: "At least one ID is required" },
        { status: 400 }
      );
    }

    // Use PostgREST "in" filter
    const filter = `(${ids.map((id) => `"${id}"`).join(",")})`;
    const res = await fetch(
      `${config.url}/rest/v1/trips?id=in.${filter}&select=id,meta,created_at,updated_at`,
      { headers: supabaseHeaders(config.key) }
    );

    if (!res.ok) {
      const errText = await res.text();
      console.error("[trips] Supabase list error:", res.status, errText);
      return NextResponse.json(
        { error: "Failed to list trips", details: errText },
        { status: res.status }
      );
    }

    const trips = await res.json();
    return NextResponse.json(trips);
  } catch (err) {
    console.error("[trips] GET error:", err);
    return NextResponse.json(
      { error: "Failed to list trips", details: String(err) },
      { status: 500 }
    );
  }
}
