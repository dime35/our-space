import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { db } from "../../../src/db/client";
import { users, posts, comments } from "../../../src/db/schema";
import { addComment, listCommentsForPost } from "../../../src/lib/comments/repository";

let authorId: number;
let postId: number;

beforeEach(async () => {
  const [user] = await db
    .insert(users)
    .values({ username: "testuser", passwordHash: "x", displayName: "Test User" })
    .returning();
  authorId = user.id;
  const [post] = await db.insert(posts).values({ authorId, title: "Hi", body: "<p>hi</p>" }).returning();
  postId = post.id;
});

afterEach(async () => {
  await db.delete(comments);
  await db.delete(posts);
  await db.delete(users);
});

describe("comments repository", () => {
  it("sanitizes and stores a comment", async () => {
    await addComment({ postId, authorId, body: "<p>nice</p><script>bad()</script>" });
    const list = await listCommentsForPost(postId);
    expect(list[0].body).toBe("<p>nice</p>");
  });

  it("lists comments oldest first", async () => {
    await addComment({ postId, authorId, body: "<p>first</p>" });
    await addComment({ postId, authorId, body: "<p>second</p>" });
    const list = await listCommentsForPost(postId);
    expect(list.map((c) => c.body)).toEqual(["<p>first</p>", "<p>second</p>"]);
  });
});
