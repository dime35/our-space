import { NextRequest, NextResponse } from "next/server";
import { addComment, listCommentsForPost } from "../../../../../lib/comments/repository";
import { getPostById } from "../../../../../lib/posts/repository";
import { requireSession } from "../../../../../lib/auth/require-session";

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  const session = requireSession(request.cookies.get("session")?.value);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const postId = Number(params.id);
  const post = await getPostById(postId);
  if (!post) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const body = await request.json().catch(() => null);
  if (typeof body?.body !== "string" || !body.body.trim()) {
    return NextResponse.json({ error: "body is required" }, { status: 400 });
  }

  const comment = await addComment({ postId, authorId: session.userId, body: body.body });
  return NextResponse.json(comment, { status: 201 });
}

export async function GET(_request: NextRequest, { params }: { params: { id: string } }) {
  const list = await listCommentsForPost(Number(params.id));
  return NextResponse.json(list);
}
