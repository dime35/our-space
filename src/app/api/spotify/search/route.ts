import { NextRequest, NextResponse } from "next/server";
import { searchTracks } from "../../../../lib/spotify/client";
import { requireSession } from "../../../../lib/auth/require-session";

export async function GET(request: NextRequest) {
  const session = requireSession(request.cookies.get("session")?.value);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const query = request.nextUrl.searchParams.get("q");
  if (!query) {
    return NextResponse.json({ error: "q query param is required" }, { status: 400 });
  }

  const results = await searchTracks(query);
  return NextResponse.json(results);
}
