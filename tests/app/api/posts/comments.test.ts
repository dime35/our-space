import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { NextRequest } from "next/server";
import { db } from "../../../../src/db/client";
import { users, posts, comments } from "../../../../src/db/schema";
import { createSessionToken } from "../../../../src/lib/auth/session";
import { POST, GET } from "../../../../src/app/api/posts/[id]/comments/route";

let authorId: number;
let postId: number;
let token: string;

beforeEach(async () => {
  process.env.SESSION_SECRET = "test-secret";
  const [user] = await db
    .insert(users)
    .values({ username: "testuser", passwordHash: "x", displayName: "Test User" })
    .returning();
  authorId = user.id;
  const [post] = await db.insert(posts).values({ authorId, title: "Hi", body: "<p>hi</p>" }).returning();
  postId = post.id;
  token = createSessionToken({ userId: authorId, username: "testuser" });
});

afterEach(async () => {
  await db.delete(comments);
  await db.delete(posts);
  await db.delete(users);
});

describe("POST /api/posts/[id]/comments", () => {
  it("rejects unauthenticated requests", async () => {
    const request = new NextRequest("http://localhost/x", {
      method: "POST",
      body: JSON.stringify({ body: "<p>nice</p>" }),
    });
    const response = await POST(request, { params: { id: String(postId) } });
    expect(response.status).toBe(401);
  });

  it("adds a comment and lists it back", async () => {
    const request = new NextRequest("http://localhost/x", {
      method: "POST",
      headers: { cookie: `session=${token}` },
      body: JSON.stringify({ body: "<p>nice</p>" }),
    });
    expect((await POST(request, { params: { id: String(postId) } })).status).toBe(201);

    const response = await GET(new NextRequest("http://localhost/x"), { params: { id: String(postId) } });
    const list = await response.json();
    expect(list).toHaveLength(1);
    expect(list[0].body).toBe("<p>nice</p>");
  });
});
