import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { NextRequest } from "next/server";
import { db } from "../../../../src/db/client";
import { users, posts, postMedia } from "../../../../src/db/schema";
import { createSessionToken } from "../../../../src/lib/auth/session";
import { POST, GET } from "../../../../src/app/api/posts/[id]/media/route";

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
  await db.delete(postMedia);
  await db.delete(posts);
  await db.delete(users);
});

describe("POST /api/posts/[id]/media", () => {
  it("rejects unauthenticated requests", async () => {
    const request = new NextRequest("http://localhost/x", {
      method: "POST",
      body: JSON.stringify({ type: "image", url: "https://example.com/a.jpg", position: 0 }),
    });
    const response = await POST(request, { params: { id: String(postId) } });
    expect(response.status).toBe(401);
  });

  it("attaches media and lists it back", async () => {
    const request = new NextRequest("http://localhost/x", {
      method: "POST",
      headers: { cookie: `session=${token}` },
      body: JSON.stringify({ type: "image", url: "https://example.com/a.jpg", position: 0 }),
    });
    expect((await POST(request, { params: { id: String(postId) } })).status).toBe(201);

    const response = await GET(new NextRequest("http://localhost/x"), { params: { id: String(postId) } });
    const list = await response.json();
    expect(list).toHaveLength(1);
    expect(list[0].type).toBe("image");
  });

  it("rejects attaching media when the requester is not the post's author", async () => {
    const [otherUser] = await db
      .insert(users)
      .values({ username: "otheruser", passwordHash: "x", displayName: "Other User" })
      .returning();
    const otherToken = createSessionToken({ userId: otherUser.id, username: "otheruser" });

    const request = new NextRequest("http://localhost/x", {
      method: "POST",
      headers: { cookie: `session=${otherToken}` },
      body: JSON.stringify({ type: "image", url: "https://example.com/a.jpg", position: 0 }),
    });
    const response = await POST(request, { params: { id: String(postId) } });
    expect(response.status).toBe(403);
  });
});
