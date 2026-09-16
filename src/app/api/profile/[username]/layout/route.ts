import { NextRequest, NextResponse } from "next/server";
import { getLayout, saveLayout, Widget } from "../../../../../lib/layout/repository";
import { getProfileByUsername } from "../../../../../lib/profiles/repository";
import { requireSession } from "../../../../../lib/auth/require-session";

export async function GET(_request: NextRequest, { params }: { params: { username: string } }) {
  const profile = await getProfileByUsername(params.username);
  if (!profile) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  const widgets = await getLayout(profile.userId);
  return NextResponse.json({ widgets });
}

export async function PUT(request: NextRequest, { params }: { params: { username: string } }) {
  const session = requireSession(request.cookies.get("session")?.value);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const profile = await getProfileByUsername(params.username);
  if (!profile || profile.userId !== session.userId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  if (!Array.isArray(body?.widgets)) {
    return NextResponse.json({ error: "widgets must be an array" }, { status: 400 });
  }

  await saveLayout(session.userId, body.widgets as Widget[]);
  return NextResponse.json({ ok: true });
}
