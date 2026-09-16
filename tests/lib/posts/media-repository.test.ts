import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { db } from "../../../src/db/client";
import { users, posts, postMedia } from "../../../src/db/schema";
import { attachMedia, listMediaForPost } from "../../../src/lib/posts/media-repository";

let postId: number;

beforeEach(async () => {
  const [user] = await db
    .insert(users)
    .values({ username: "testuser", passwordHash: "x", displayName: "Test User" })
    .returning();
  const [post] = await db.insert(posts).values({ authorId: user.id, title: "Hi", body: "<p>hi</p>" }).returning();
  postId = post.id;
});

afterEach(async () => {
  await db.delete(postMedia);
  await db.delete(posts);
  await db.delete(users);
});

describe("post media repository", () => {
  it("attaches and lists media in position order", async () => {
    await attachMedia({ postId, type: "song", url: "spotify:track:abc", position: 1 });
    await attachMedia({ postId, type: "image", url: "https://example.com/a.jpg", position: 0 });
    const list = await listMediaForPost(postId);
    expect(list.map((m) => m.type)).toEqual(["image", "song"]);
  });

  it("rejects an invalid media type", async () => {
    await expect(
      attachMedia({ postId, type: "gif" as never, url: "x", position: 0 })
    ).rejects.toThrow("Invalid media type: gif");
  });
});
