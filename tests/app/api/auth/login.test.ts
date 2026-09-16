import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { NextRequest } from "next/server";
import { db } from "../../../../src/db/client";
import { users } from "../../../../src/db/schema";
import { hashPassword } from "../../../../src/lib/auth/password";
import { POST as login } from "../../../../src/app/api/auth/login/route";

beforeEach(async () => {
  await db.insert(users).values({
    username: "testuser",
    passwordHash: await hashPassword("hunter2"),
    displayName: "Test User",
  });
});

afterEach(async () => {
  await db.delete(users);
});

function jsonRequest(body: unknown) {
  return new NextRequest("http://localhost/api/auth/login", {
    method: "POST",
    body: JSON.stringify(body),
    headers: { "Content-Type": "application/json" },
  });
}

describe("POST /api/auth/login", () => {
  it("sets a session cookie for correct credentials", async () => {
    const response = await login(jsonRequest({ username: "testuser", password: "hunter2" }));
    expect(response.status).toBe(200);
    expect(response.cookies.get("session")?.value).toBeTruthy();
  });

  it("returns 401 with a generic message for wrong credentials", async () => {
    const response = await login(jsonRequest({ username: "testuser", password: "wrong" }));
    expect(response.status).toBe(401);
    const body = await response.json();
    expect(body.error).toBe("Invalid username or password");
  });

  it("returns 400 when fields are missing", async () => {
    const response = await login(jsonRequest({ username: "testuser" }));
    expect(response.status).toBe(400);
  });
});
