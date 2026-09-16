import { describe, it, expect, beforeAll } from "vitest";
import { createSessionToken, verifySessionToken } from "../../../src/lib/auth/session";

beforeAll(() => {
  process.env.SESSION_SECRET = "test-secret";
});

describe("session tokens", () => {
  it("round-trips a valid payload", () => {
    const token = createSessionToken({ userId: 1, username: "dime35" });
    expect(verifySessionToken(token)).toEqual({ userId: 1, username: "dime35" });
  });

  it("rejects a tampered token", () => {
    const token = createSessionToken({ userId: 1, username: "dime35" });
    const tampered = token.slice(0, -1) + (token.at(-1) === "a" ? "b" : "a");
    expect(verifySessionToken(tampered)).toBeNull();
  });

  it("rejects a malformed token", () => {
    expect(verifySessionToken("not-a-real-token")).toBeNull();
  });
});
