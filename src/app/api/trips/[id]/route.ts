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

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const config = getSupabaseConfig();
  if (!config) {
    return NextResponse.json(
      { error: "Supabase not configured" },
      { status: 501 }
    );
  }

  try {
    const { id } = await params;

    const res = await fetch(
      `${config.url}/rest/v1/trips?id=eq.${encodeURIComponent(id)}&select=id,meta,data,created_at,updated_at`,
      { headers: supabaseHeaders(config.key) }
    );

    if (!res.ok) {
      const errText = await res.text();
      console.error("[trips] Supabase GET error:", res.status, errText);
      return NextResponse.json(
        { error: "Failed to load trip", details: errText },
        { status: res.status }
      );
    }

    const trips = await res.json();
    if (trips.length === 0) {
      return NextResponse.json(
        { error: "Trip not found" },
        { status: 404 }
      );
    }

    const trip = trips[0];
    return NextResponse.json({
      meta: trip.meta,
      data: trip.data,
    });
  } catch (err) {
    console.error("[trips] GET error:", err);
    return NextResponse.json(
      { error: "Failed to load trip", details: String(err) },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const config = getSupabaseConfig();
  if (!config) {
    return NextResponse.json(
      { error: "Supabase not configured" },
      { status: 501 }
    );
  }

  try {
    const { id } = await params;
    const { passphrase, meta, data } = await request.json();

    if (!passphrase) {
      return NextResponse.json(
        { error: "passphrase is required" },
        { status: 400 }
      );
    }

    // Fetch stored hash
    const checkRes = await fetch(
      `${config.url}/rest/v1/trips?id=eq.${encodeURIComponent(id)}&select=passphrase_hash`,
      { headers: supabaseHeaders(config.key) }
    );

    if (!checkRes.ok) {
      const errText = await checkRes.text();
      console.error("[trips] Supabase check error:", checkRes.status, errText);
      return NextResponse.json(
        { error: "Failed to verify trip", details: errText },
        { status: checkRes.status }
      );
    }

    const existing = await checkRes.json();
    if (existing.length === 0) {
      return NextResponse.json(
        { error: "Trip not found" },
        { status: 404 }
      );
    }

    const storedHash = existing[0].passphrase_hash;
    const providedHash = hashPassphrase(passphrase);

    if (storedHash !== providedHash) {
      return NextResponse.json(
        { error: "Invalid passphrase" },
        { status: 403 }
      );
    }

    // Build update payload
    const updatePayload: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };
    if (meta !== undefined) updatePayload.meta = meta;
    if (data !== undefined) updatePayload.data = data;

    const updateRes = await fetch(
      `${config.url}/rest/v1/trips?id=eq.${encodeURIComponent(id)}`,
      {
        method: "PATCH",
        headers: supabaseHeaders(config.key, "return=representation"),
        body: JSON.stringify(updatePayload),
      }
    );

    if (!updateRes.ok) {
      const errText = await updateRes.text();
      console.error("[trips] Supabase update error:", updateRes.status, errText);
      return NextResponse.json(
        { error: "Failed to update trip", details: errText },
        { status: updateRes.status }
      );
    }

    const updated = await updateRes.json();
    console.log("[trips] Updated trip:", id);
    return NextResponse.json({
      id: updated[0]?.id,
      meta: updated[0]?.meta,
      updated_at: updated[0]?.updated_at,
    });
  } catch (err) {
    console.error("[trips] PUT error:", err);
    return NextResponse.json(
      { error: "Failed to update trip", details: String(err) },
      { status: 500 }
    );
  }
}
