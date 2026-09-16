import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { db } from "../../../src/db/client";
import { users, profiles } from "../../../src/db/schema";
import { getProfileByUsername, updateProfile } from "../../../src/lib/profiles/repository";

let userId: number;

beforeEach(async () => {
  const [user] = await db
    .insert(users)
    .values({ username: "testuser", passwordHash: "x", displayName: "Test User" })
    .returning();
  userId = user.id;
  await db.insert(profiles).values({ userId, bio: "hello" });
});

afterEach(async () => {
  await db.delete(profiles);
  await db.delete(users);
});

describe("profiles repository", () => {
  it("fetches a profile by username", async () => {
    const profile = await getProfileByUsername("testuser");
    expect(profile?.bio).toBe("hello");
    expect(profile?.themeId).toBe("classic");
  });

  it("returns null for an unknown username", async () => {
    expect(await getProfileByUsername("nobody")).toBeNull();
  });

  it("updates profile fields", async () => {
    await updateProfile(userId, { bio: "updated bio" });
    const profile = await getProfileByUsername("testuser");
    expect(profile?.bio).toBe("updated bio");
  });
});
