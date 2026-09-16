let cachedToken: { value: string; expiresAt: number } | null = null;

async function getAccessToken(fetchImpl: typeof fetch): Promise<string> {
  if (cachedToken && cachedToken.expiresAt > Date.now()) {
    return cachedToken.value;
  }

  const clientId = process.env.SPOTIFY_CLIENT_ID;
  const clientSecret = process.env.SPOTIFY_CLIENT_SECRET;
  if (!clientId || !clientSecret) throw new Error("Spotify credentials are not set");

  const response = await fetchImpl("https://accounts.spotify.com/api/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization: `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString("base64")}`,
    },
    body: "grant_type=client_credentials",
  });
  if (!response.ok) throw new Error("Failed to fetch Spotify access token");

  const data = await response.json();
  cachedToken = { value: data.access_token, expiresAt: Date.now() + (data.expires_in - 60) * 1000 };
  return cachedToken.value;
}

export interface SpotifyTrack {
  id: string;
  name: string;
  artist: string;
  url: string;
}

export async function searchTracks(query: string, fetchImpl: typeof fetch = fetch): Promise<SpotifyTrack[]> {
  const token = await getAccessToken(fetchImpl);
  const response = await fetchImpl(
    `https://api.spotify.com/v1/search?type=track&limit=10&q=${encodeURIComponent(query)}`,
    { headers: { Authorization: `Bearer ${token}` } }
  );
  if (!response.ok) throw new Error("Spotify search failed");

  const data = await response.json();
  return data.tracks.items.map((track: { id: string; name: string; artists: { name: string }[]; external_urls: { spotify: string } }) => ({
    id: track.id,
    name: track.name,
    artist: track.artists.map((a) => a.name).join(", "),
    url: track.external_urls.spotify,
  }));
}

export function resetSpotifyTokenCacheForTests(): void {
  cachedToken = null;
}
