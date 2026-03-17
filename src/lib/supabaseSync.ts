// src/lib/supabaseSync.ts

/**
 * Remote Supabase operations via the app's own API routes.
 * All functions are async, handle errors gracefully (return null/false on failure, never throw),
 * and log errors to console.
 */

export function isSupabaseEnabled(): boolean {
  return !!process.env.NEXT_PUBLIC_SUPABASE_URL;
}

/**
 * Create a trip in Supabase.
 * Calls POST /api/trips with { id, passphrase, meta, data }
 */
export async function createTripRemote(
  id: string,
  passphrase: string,
  meta: object,
  data: object
): Promise<boolean> {
  try {
    const res = await fetch("/api/trips", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, passphrase, meta, data }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      console.error("createTripRemote failed:", res.status, err);
      return false;
    }
    return true;
  } catch (e) {
    console.error("createTripRemote error:", e);
    return false;
  }
}

/**
 * Update a trip in Supabase (requires correct passphrase).
 * Calls PUT /api/trips/[id] with { passphrase, meta, data }
 */
export async function syncTripToRemote(
  id: string,
  passphrase: string,
  meta: object,
  data: object
): Promise<boolean> {
  try {
    const res = await fetch(`/api/trips/${encodeURIComponent(id)}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ passphrase, meta, data }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      console.error("syncTripToRemote failed:", res.status, err);
      return false;
    }
    return true;
  } catch (e) {
    console.error("syncTripToRemote error:", e);
    return false;
  }
}

/**
 * Load a trip from Supabase (public, no passphrase).
 * Calls GET /api/trips/[id]
 */
export async function loadTripFromRemote(
  id: string
): Promise<{ meta: object; data: object } | null> {
  try {
    const res = await fetch(`/api/trips/${encodeURIComponent(id)}`);
    if (!res.ok) {
      console.error("loadTripFromRemote failed:", res.status);
      return null;
    }
    const json = await res.json();
    return { meta: json.meta, data: json.data };
  } catch (e) {
    console.error("loadTripFromRemote error:", e);
    return null;
  }
}

/**
 * Verify a passphrase against stored hash.
 * Calls GET /api/trips/[id]/verify?passphrase=...
 */
export async function verifyPassphrase(
  id: string,
  passphrase: string
): Promise<boolean> {
  try {
    const res = await fetch(
      `/api/trips/${encodeURIComponent(id)}/verify?passphrase=${encodeURIComponent(passphrase)}`
    );
    if (!res.ok) {
      console.error("verifyPassphrase failed:", res.status);
      return false;
    }
    const json = await res.json();
    return !!json.valid;
  } catch (e) {
    console.error("verifyPassphrase error:", e);
    return false;
  }
}

/**
 * Load multiple trip metas by IDs.
 * Calls GET /api/trips?ids=id1,id2,id3
 */
export async function loadTripMetasFromRemote(
  ids: string[]
): Promise<
  Array<{
    id: string;
    title: string;
    startCity: string;
    endCity: string;
    totalDays: number;
    startDate: string;
    endDate: string;
    updatedAt: number;
  }>
> {
  if (ids.length === 0) return [];
  try {
    const res = await fetch(
      `/api/trips?ids=${ids.map(encodeURIComponent).join(",")}`
    );
    if (!res.ok) {
      console.error("loadTripMetasFromRemote failed:", res.status);
      return [];
    }
    const json = await res.json();
    return json.trips ?? json ?? [];
  } catch (e) {
    console.error("loadTripMetasFromRemote error:", e);
    return [];
  }
}
