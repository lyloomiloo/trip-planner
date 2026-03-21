import { NextRequest, NextResponse } from "next/server";

/**
 * Proxies external images server-side to bypass CORS restrictions.
 * Used by PDF export to inline images that don't send CORS headers.
 */
export async function GET(req: NextRequest) {
  const url = req.nextUrl.searchParams.get("url");
  if (!url) {
    return NextResponse.json({ error: "Missing url param" }, { status: 400 });
  }

  // Basic validation — only allow http(s) URLs
  if (!url.startsWith("http://") && !url.startsWith("https://")) {
    return NextResponse.json({ error: "Invalid URL" }, { status: 400 });
  }

  try {
    const res = await fetch(url, {
      headers: {
        // Some servers require a user-agent
        "User-Agent": "Mozilla/5.0 (compatible; TripPlanner/1.0)",
      },
      signal: AbortSignal.timeout(10000),
    });

    if (!res.ok) {
      return NextResponse.json({ error: "Upstream error" }, { status: res.status });
    }

    const contentType = res.headers.get("content-type") || "image/jpeg";

    // Only proxy image content types
    if (!contentType.startsWith("image/")) {
      return NextResponse.json({ error: "Not an image" }, { status: 400 });
    }

    const buffer = await res.arrayBuffer();

    return new NextResponse(buffer, {
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "public, max-age=86400",
      },
    });
  } catch {
    return NextResponse.json({ error: "Failed to fetch image" }, { status: 502 });
  }
}
