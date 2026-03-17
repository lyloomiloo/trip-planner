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

function supabaseHeaders(key: string) {
  return {
    apikey: key,
    Authorization: `Bearer ${key}`,
    "Content-Type": "application/json",
  };
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
    const { searchParams } = new URL(request.url);
    const passphrase = searchParams.get("passphrase");

    if (!passphrase) {
      return NextResponse.json(
        { error: "passphrase query parameter is required" },
        { status: 400 }
      );
    }

    // Fetch stored hash
    const res = await fetch(
      `${config.url}/rest/v1/trips?id=eq.${encodeURIComponent(id)}&select=passphrase_hash`,
      { headers: supabaseHeaders(config.key) }
    );

    if (!res.ok) {
      const errText = await res.text();
      console.error("[trips/verify] Supabase error:", res.status, errText);
      return NextResponse.json(
        { error: "Failed to verify trip", details: errText },
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

    const storedHash = trips[0].passphrase_hash;
    const providedHash = hashPassphrase(passphrase);

    return NextResponse.json({ valid: storedHash === providedHash });
  } catch (err) {
    console.error("[trips/verify] Error:", err);
    return NextResponse.json(
      { error: "Failed to verify passphrase", details: String(err) },
      { status: 500 }
    );
  }
}
