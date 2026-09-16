import { NextRequest, NextResponse } from "next/server";
import { getPostById } from "../../../../lib/posts/repository";
import { parseId } from "../../../../lib/parse-id";

export async function GET(_request: NextRequest, { params }: { params: { id: string } }) {
  const postId = parseId(params.id);
  if (postId === null) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  const post = await getPostById(postId);
  if (!post) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  return NextResponse.json(post);
}
