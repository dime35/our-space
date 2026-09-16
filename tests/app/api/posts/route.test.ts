import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { NextRequest } from "next/server";
import { db } from "../../../../src/db/client";
import { users, posts } from "../../../../src/db/schema";
import { createSessionToken } from "../../../../src/lib/auth/session";
import { POST, GET } from "../../../../src/app/api/posts/route";

let authorId: number;
let token: string;

beforeEach(async () => {
  process.env.SESSION_SECRET = "test-secret";
  const [user] = await db
    .insert(users)
    .values({ username: "testuser", passwordHash: "x", displayName: "Test User" })
    .returning();
  authorId = user.id;
  token = createSessionToken({ userId: authorId, username: "testuser" });
});

afterEach(async () => {
  await db.delete(posts);
  await db.delete(users);
});

describe("POST /api/posts", () => {
  it("rejects unauthenticated requests", async () => {
    const request = new NextRequest("http://localhost/api/posts", {
      method: "POST",
      body: JSON.stringify({ title: "Hi", body: "<p>hi</p>" }),
    });
    expect((await POST(request)).status).toBe(401);
  });

  it("creates a post and sanitizes the body", async () => {
    const request = new NextRequest("http://localhost/api/posts", {
      method: "POST",
      headers: { cookie: `session=${token}` },
      body: JSON.stringify({ title: "Hi", body: "<p>hi</p><script>bad()</script>" }),
    });
    const response = await POST(request);
    expect(response.status).toBe(201);
    const created = await response.json();
    expect(created.body).toBe("<p>hi</p>");
  });
});

describe("GET /api/posts", () => {
  it("lists posts for the given authorId query param", async () => {
    const create = new NextRequest("http://localhost/api/posts", {
      method: "POST",
      headers: { cookie: `session=${token}` },
      body: JSON.stringify({ title: "Hi", body: "<p>hi</p>" }),
    });
    await POST(create);

    const response = await GET(new NextRequest(`http://localhost/api/posts?authorId=${authorId}`));
    const list = await response.json();
    expect(list).toHaveLength(1);
    expect(list[0].title).toBe("Hi");
  });
});
