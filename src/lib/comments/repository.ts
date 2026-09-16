import { asc, eq } from "drizzle-orm";
import { db } from "../../db/client";
import { comments } from "../../db/schema";
import { sanitizePostHtml } from "../sanitize/html";

export interface CreateCommentInput {
  postId: number;
  authorId: number;
  body: string;
}

export async function addComment(input: CreateCommentInput) {
  const [row] = await db
    .insert(comments)
    .values({ ...input, body: sanitizePostHtml(input.body) })
    .returning();
  return row;
}

export async function listCommentsForPost(postId: number) {
  return db.select().from(comments).where(eq(comments.postId, postId)).orderBy(asc(comments.createdAt));
}
