import { NextRequest, NextResponse } from "next/server";
import { attachMedia, listMediaForPost, MediaType, VALID_TYPES } from "../../../../../lib/posts/media-repository";
import { getPostById } from "../../../../../lib/posts/repository";
import { requireSession } from "../../../../../lib/auth/require-session";
import { parseId } from "../../../../../lib/parse-id";

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  const session = requireSession(request.cookies.get("session")?.value);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const postId = parseId(params.id);
  if (postId === null) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  const post = await getPostById(postId);
  if (!post) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  if (post.authorId !== session.userId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  if (!body?.type || !VALID_TYPES.has(body.type) || typeof body.url !== "string") {
    return NextResponse.json({ error: "type and url are required" }, { status: 400 });
  }

  const media = await attachMedia({
    postId,
    type: body.type as MediaType,
    url: body.url,
    position: Number(body.position) || 0,
  });
  return NextResponse.json(media, { status: 201 });
}

export async function GET(_request: NextRequest, { params }: { params: { id: string } }) {
  const postId = parseId(params.id);
  if (postId === null) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  const list = await listMediaForPost(postId);
  return NextResponse.json(list);
}
