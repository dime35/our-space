import { asc, eq } from "drizzle-orm";
import { db } from "../../db/client";
import { postMedia } from "../../db/schema";

export type MediaType = "image" | "video_upload" | "video_youtube" | "song";
export const VALID_TYPES = new Set<MediaType>(["image", "video_upload", "video_youtube", "song"]);

export interface AttachMediaInput {
  postId: number;
  type: MediaType;
  url: string;
  position: number;
}

export async function attachMedia(input: AttachMediaInput) {
  if (!VALID_TYPES.has(input.type)) {
    throw new Error(`Invalid media type: ${input.type}`);
  }
  const [row] = await db.insert(postMedia).values(input).returning();
  return row;
}

export async function listMediaForPost(postId: number) {
  return db.select().from(postMedia).where(eq(postMedia.postId, postId)).orderBy(asc(postMedia.position));
}
