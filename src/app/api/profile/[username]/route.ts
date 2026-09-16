import { NextRequest, NextResponse } from "next/server";
import { getProfileByUsername, updateProfile } from "../../../../lib/profiles/repository";
import { requireSession } from "../../../../lib/auth/require-session";
import { sanitizeAndScopeCss } from "../../../../lib/sanitize/css";

export async function GET(_request: NextRequest, { params }: { params: { username: string } }) {
  const profile = await getProfileByUsername(params.username);
  if (!profile) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  return NextResponse.json(profile);
}

export async function PATCH(request: NextRequest, { params }: { params: { username: string } }) {
  const session = requireSession(request.cookies.get("session")?.value);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const profile = await getProfileByUsername(params.username);
  if (!profile || profile.userId !== session.userId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  if (!body) {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  const update: Record<string, unknown> = {};
  if (typeof body.bio === "string") update.bio = body.bio;
  if (typeof body.profilePictureUrl === "string") update.profilePictureUrl = body.profilePictureUrl;
  if (typeof body.themeId === "string") update.themeId = body.themeId;
  if (typeof body.profileSongUrl === "string") update.profileSongUrl = body.profileSongUrl;
  if (typeof body.customCss === "string") update.customCss = sanitizeAndScopeCss(body.customCss);

  await updateProfile(session.userId, update);
  return NextResponse.json({ ok: true });
}
