import { desc, eq } from "drizzle-orm";
import { db } from "../../db/client";
import { posts } from "../../db/schema";

export interface CreatePostInput {
  authorId: number;
  title: string;
  body: string;
}

export async function createPost(input: CreatePostInput) {
  const [row] = await db.insert(posts).values(input).returning();
  return row;
}

export async function listPostsByAuthor(authorId: number) {
  return db.select().from(posts).where(eq(posts.authorId, authorId)).orderBy(desc(posts.createdAt));
}

export async function getPostById(id: number) {
  const [row] = await db.select().from(posts).where(eq(posts.id, id)).limit(1);
  return row ?? null;
}
