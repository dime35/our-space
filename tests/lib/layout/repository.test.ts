import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { db } from "../../../src/db/client";
import { users, profileLayouts } from "../../../src/db/schema";
import { getLayout, saveLayout, Widget } from "../../../src/lib/layout/repository";

let userId: number;

beforeEach(async () => {
  const [user] = await db
    .insert(users)
    .values({ username: "testuser", passwordHash: "x", displayName: "Test User" })
    .returning();
  userId = user.id;
});

afterEach(async () => {
  await db.delete(profileLayouts);
  await db.delete(users);
});

describe("layout repository", () => {
  it("returns an empty array when no layout has been saved", async () => {
    expect(await getLayout(userId)).toEqual([]);
  });

  it("saves and retrieves widgets", async () => {
    const widgets: Widget[] = [
      { id: "w1", type: "bio", col: 0, row: 0, width: 2, height: 1 },
    ];
    await saveLayout(userId, widgets);
    expect(await getLayout(userId)).toEqual(widgets);
  });

  it("overwrites an existing layout on re-save", async () => {
    await saveLayout(userId, [{ id: "w1", type: "bio", col: 0, row: 0, width: 2, height: 1 }]);
    await saveLayout(userId, [{ id: "w2", type: "feed", col: 1, row: 1, width: 3, height: 2 }]);
    const layout = await getLayout(userId);
    expect(layout).toHaveLength(1);
    expect(layout[0].id).toBe("w2");
  });
});
