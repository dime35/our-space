import { describe, it, expect, beforeAll } from "vitest";
import { createSessionToken } from "../../../src/lib/auth/session";
import { requireSession } from "../../../src/lib/auth/require-session";

beforeAll(() => {
  process.env.SESSION_SECRET = "test-secret";
});

describe("requireSession", () => {
  it("returns the payload for a valid token", () => {
    const token = createSessionToken({ userId: 2, username: "gf" });
    expect(requireSession(token)).toEqual({ userId: 2, username: "gf" });
  });

  it("returns null when no token is present", () => {
    expect(requireSession(undefined)).toBeNull();
  });

  it("returns null for an invalid token", () => {
    expect(requireSession("garbage")).toBeNull();
  });
});
