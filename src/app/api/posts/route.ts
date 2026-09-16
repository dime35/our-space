import { NextRequest, NextResponse } from "next/server";
import { createPost, listPostsByAuthor } from "../../../lib/posts/repository";
import { requireSession } from "../../../lib/auth/require-session";
import { sanitizePostHtml } from "../../../lib/sanitize/html";

export async function POST(request: NextRequest) {
  const session = requireSession(request.cookies.get("session")?.value);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  if (!body?.title || typeof body.body !== "string") {
    return NextResponse.json({ error: "title and body are required" }, { status: 400 });
  }

  const post = await createPost({
    authorId: session.userId,
    title: body.title,
    body: sanitizePostHtml(body.body),
  });
  return NextResponse.json(post, { status: 201 });
}

export async function GET(request: NextRequest) {
  const authorId = Number(request.nextUrl.searchParams.get("authorId"));
  if (!authorId) {
    return NextResponse.json({ error: "authorId query param is required" }, { status: 400 });
  }
  const list = await listPostsByAuthor(authorId);
  return NextResponse.json(list);
}
