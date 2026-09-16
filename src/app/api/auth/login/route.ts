import { NextRequest, NextResponse } from "next/server";
import { authenticate } from "../../../../lib/auth/authenticate";
import { SESSION_COOKIE } from "../../../../lib/auth/session";

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
  if (!body?.username || !body?.password) {
    return NextResponse.json({ error: "Username and password are required" }, { status: 400 });
  }

  const token = await authenticate(body.username, body.password);
  if (!token) {
    return NextResponse.json({ error: "Invalid username or password" }, { status: 401 });
  }

  const response = NextResponse.json({ ok: true });
  response.cookies.set(SESSION_COOKIE.name, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: SESSION_COOKIE.maxAge,
    path: "/",
  });
  return response;
}
