import { describe, it, expect, vi, beforeEach } from "vitest";
import { searchTracks, resetSpotifyTokenCacheForTests } from "../../../src/lib/spotify/client";

beforeEach(() => {
  resetSpotifyTokenCacheForTests();
  process.env.SPOTIFY_CLIENT_ID = "id";
  process.env.SPOTIFY_CLIENT_SECRET = "secret";
});

function mockFetch() {
  return vi.fn(async (url: string) => {
    if (url.includes("accounts.spotify.com")) {
      return new Response(JSON.stringify({ access_token: "tok", expires_in: 3600 }), { status: 200 });
    }
    return new Response(
      JSON.stringify({
        tracks: {
          items: [
            {
              id: "abc",
              name: "Song",
              artists: [{ name: "Artist" }],
              external_urls: { spotify: "https://open.spotify.com/track/abc" },
            },
          ],
        },
      }),
      { status: 200 }
    );
  });
}

describe("searchTracks", () => {
  it("exchanges credentials for a token and returns mapped tracks", async () => {
    const fetchImpl = mockFetch();
    const results = await searchTracks("song", fetchImpl as unknown as typeof fetch);
    expect(results).toEqual([{ id: "abc", name: "Song", artist: "Artist", url: "https://open.spotify.com/track/abc" }]);
    expect(fetchImpl).toHaveBeenCalledTimes(2);
  });

  it("reuses a cached token on a second search", async () => {
    const fetchImpl = mockFetch();
    await searchTracks("song", fetchImpl as unknown as typeof fetch);
    await searchTracks("another", fetchImpl as unknown as typeof fetch);
    const tokenCalls = fetchImpl.mock.calls.filter(([url]) => String(url).includes("accounts.spotify.com"));
    expect(tokenCalls).toHaveLength(1);
  });
});
