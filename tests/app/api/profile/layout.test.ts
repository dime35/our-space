import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { NextRequest } from "next/server";
import { db } from "../../../../src/db/client";
import { users, profiles, profileLayouts } from "../../../../src/db/schema";
import { createSessionToken } from "../../../../src/lib/auth/session";
import { GET, PUT } from "../../../../src/app/api/profile/[username]/layout/route";

let userId: number;
let token: string;

beforeEach(async () => {
  process.env.SESSION_SECRET = "test-secret";
  const [user] = await db
    .insert(users)
    .values({ username: "testuser", passwordHash: "x", displayName: "Test User" })
    .returning();
  userId = user.id;
  await db.insert(profiles).values({ userId });
  token = createSessionToken({ userId, username: "testuser" });
});

afterEach(async () => {
  await db.delete(profileLayouts);
  await db.delete(profiles);
  await db.delete(users);
});

describe("GET /api/profile/[username]/layout", () => {
  it("returns an empty layout initially", async () => {
    const response = await GET(new NextRequest("http://localhost/x"), { params: { username: "testuser" } });
    expect(await response.json()).toEqual({ widgets: [] });
  });
});

describe("PUT /api/profile/[username]/layout", () => {
  it("rejects unauthenticated requests", async () => {
    const request = new NextRequest("http://localhost/x", { method: "PUT", body: JSON.stringify({ widgets: [] }) });
    const response = await PUT(request, { params: { username: "testuser" } });
    expect(response.status).toBe(401);
  });

  it("saves widgets for the authenticated owner", async () => {
    const widgets = [{ id: "w1", type: "bio", col: 0, row: 0, width: 2, height: 1 }];
    const request = new NextRequest("http://localhost/x", {
      method: "PUT",
      headers: { cookie: `session=${token}` },
      body: JSON.stringify({ widgets }),
    });
    const response = await PUT(request, { params: { username: "testuser" } });
    expect(response.status).toBe(200);

    const check = await GET(new NextRequest("http://localhost/x"), { params: { username: "testuser" } });
    expect(await check.json()).toEqual({ widgets });
  });

  it("rejects a non-owner's attempt to save another user's layout", async () => {
    const [otherUser] = await db
      .insert(users)
      .values({ username: "otheruser", passwordHash: "x", displayName: "Other User" })
      .returning();
    await db.insert(profiles).values({ userId: otherUser.id });
    const otherToken = createSessionToken({ userId: otherUser.id, username: "otheruser" });

    const request = new NextRequest("http://localhost/x", {
      method: "PUT",
      headers: { cookie: `session=${otherToken}` },
      body: JSON.stringify({ widgets: [{ id: "w1", type: "bio", col: 0, row: 0, width: 2, height: 1 }] }),
    });
    const response = await PUT(request, { params: { username: "testuser" } });
    expect(response.status).toBe(403);
  });
});
