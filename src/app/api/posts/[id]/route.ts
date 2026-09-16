import { NextRequest, NextResponse } from "next/server";
import { getPostById } from "../../../../lib/posts/repository";

export async function GET(_request: NextRequest, { params }: { params: { id: string } }) {
  const post = await getPostById(Number(params.id));
  if (!post) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  return NextResponse.json(post);
}
