import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { db } from "../../../src/db/client";
import { users } from "../../../src/db/schema";
import { hashPassword } from "../../../src/lib/auth/password";
import { verifySessionToken } from "../../../src/lib/auth/session";
import { authenticate } from "../../../src/lib/auth/authenticate";

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

describe("authenticate", () => {
  it("returns a valid session token for correct credentials", async () => {
    const token = await authenticate("testuser", "hunter2");
    expect(token).not.toBeNull();
    expect(verifySessionToken(token!)?.username).toBe("testuser");
  });

  it("returns null for a wrong password", async () => {
    expect(await authenticate("testuser", "wrong")).toBeNull();
  });

  it("returns null for an unknown username", async () => {
    expect(await authenticate("nobody", "hunter2")).toBeNull();
  });
});
