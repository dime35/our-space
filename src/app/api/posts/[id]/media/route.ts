import { NextRequest, NextResponse } from "next/server";
import { attachMedia, listMediaForPost, MediaType } from "../../../../../lib/posts/media-repository";
import { getPostById } from "../../../../../lib/posts/repository";
import { requireSession } from "../../../../../lib/auth/require-session";

const VALID_TYPES = new Set(["image", "video_upload", "video_youtube", "song"]);

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  const session = requireSession(request.cookies.get("session")?.value);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const postId = Number(params.id);
  const post = await getPostById(postId);
  if (!post || post.authorId !== session.userId) {
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
  const list = await listMediaForPost(Number(params.id));
  return NextResponse.json(list);
}
