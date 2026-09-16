import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { db } from "../../../src/db/client";
import { users, posts } from "../../../src/db/schema";
import { createPost, listPostsByAuthor, getPostById } from "../../../src/lib/posts/repository";

let authorId: number;

beforeEach(async () => {
  const [user] = await db
    .insert(users)
    .values({ username: "testuser", passwordHash: "x", displayName: "Test User" })
    .returning();
  authorId = user.id;
});

afterEach(async () => {
  await db.delete(posts);
  await db.delete(users);
});

describe("posts repository", () => {
  it("creates and fetches a post by id", async () => {
    const created = await createPost({ authorId, title: "Hello", body: "<p>World</p>" });
    const fetched = await getPostById(created.id);
    expect(fetched?.title).toBe("Hello");
  });

  it("lists posts by author, newest first", async () => {
    await createPost({ authorId, title: "First", body: "<p>1</p>" });
    await createPost({ authorId, title: "Second", body: "<p>2</p>" });
    const list = await listPostsByAuthor(authorId);
    expect(list.map((p) => p.title)).toEqual(["Second", "First"]);
  });
});
