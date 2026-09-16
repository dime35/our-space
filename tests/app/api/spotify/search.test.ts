import { describe, it, expect, vi, beforeAll } from "vitest";
import { NextRequest } from "next/server";
import { createSessionToken } from "../../../../src/lib/auth/session";
import * as spotifyClient from "../../../../src/lib/spotify/client";
import { GET } from "../../../../src/app/api/spotify/search/route";

let token: string;

beforeAll(() => {
  process.env.SESSION_SECRET = "test-secret";
  token = createSessionToken({ userId: 1, username: "testuser" });
});

describe("GET /api/spotify/search", () => {
  it("rejects unauthenticated requests", async () => {
    const response = await GET(new NextRequest("http://localhost/api/spotify/search?q=song"));
    expect(response.status).toBe(401);
  });

  it("returns search results for an authenticated request", async () => {
    vi.spyOn(spotifyClient, "searchTracks").mockResolvedValueOnce([
      { id: "abc", name: "Song", artist: "Artist", url: "https://open.spotify.com/track/abc" },
    ]);
    const request = new NextRequest("http://localhost/api/spotify/search?q=song", {
      headers: { cookie: `session=${token}` },
    });
    const response = await GET(request);
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body).toEqual([{ id: "abc", name: "Song", artist: "Artist", url: "https://open.spotify.com/track/abc" }]);
  });

  it("returns 400 when q is missing", async () => {
    const request = new NextRequest("http://localhost/api/spotify/search", {
      headers: { cookie: `session=${token}` },
    });
    expect((await GET(request)).status).toBe(400);
  });
});
