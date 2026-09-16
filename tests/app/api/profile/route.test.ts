import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { NextRequest } from "next/server";
import { db } from "../../../../src/db/client";
import { users, profiles } from "../../../../src/db/schema";
import { createSessionToken } from "../../../../src/lib/auth/session";
import { GET, PATCH } from "../../../../src/app/api/profile/[username]/route";

let userId: number;
let token: string;

beforeEach(async () => {
  process.env.SESSION_SECRET = "test-secret";
  const [user] = await db
    .insert(users)
    .values({ username: "testuser", passwordHash: "x", displayName: "Test User" })
    .returning();
  userId = user.id;
  await db.insert(profiles).values({ userId, bio: "hello" });
  token = createSessionToken({ userId, username: "testuser" });
});

afterEach(async () => {
  await db.delete(profiles);
  await db.delete(users);
});

describe("GET /api/profile/[username]", () => {
  it("returns the profile", async () => {
    const response = await GET(new NextRequest("http://localhost/api/profile/testuser"), {
      params: { username: "testuser" },
    });
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.bio).toBe("hello");
  });

  it("returns 404 for an unknown username", async () => {
    const response = await GET(new NextRequest("http://localhost/api/profile/nobody"), {
      params: { username: "nobody" },
    });
    expect(response.status).toBe(404);
  });
});

describe("PATCH /api/profile/[username]", () => {
  it("rejects unauthenticated requests", async () => {
    const request = new NextRequest("http://localhost/api/profile/testuser", {
      method: "PATCH",
      body: JSON.stringify({ bio: "new bio" }),
    });
    const response = await PATCH(request, { params: { username: "testuser" } });
    expect(response.status).toBe(401);
  });

  it("updates the profile and scopes custom CSS for the owner", async () => {
    const request = new NextRequest("http://localhost/api/profile/testuser", {
      method: "PATCH",
      headers: { cookie: `session=${token}` },
      body: JSON.stringify({ bio: "new bio", customCss: ".x { color: red; }" }),
    });
    const response = await PATCH(request, { params: { username: "testuser" } });
    expect(response.status).toBe(200);

    const check = await GET(new NextRequest("http://localhost/api/profile/testuser"), {
      params: { username: "testuser" },
    });
    const body = await check.json();
    expect(body.bio).toBe("new bio");
    expect(body.customCss).toContain(".profile-custom-css .x");
  });

  it("rejects a non-owner's attempt to update another user's profile", async () => {
    const [otherUser] = await db
      .insert(users)
      .values({ username: "otheruser", passwordHash: "x", displayName: "Other User" })
      .returning();
    await db.insert(profiles).values({ userId: otherUser.id, bio: "other bio" });
    const otherToken = createSessionToken({ userId: otherUser.id, username: "otheruser" });

    const request = new NextRequest("http://localhost/api/profile/testuser", {
      method: "PATCH",
      headers: { cookie: `session=${otherToken}` },
      body: JSON.stringify({ bio: "hacked bio" }),
    });
    const response = await PATCH(request, { params: { username: "testuser" } });
    expect(response.status).toBe(403);
  });
});
