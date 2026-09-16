import { eq } from "drizzle-orm";
import { db } from "../../db/client";
import { users } from "../../db/schema";
import { verifyPassword } from "./password";
import { createSessionToken } from "./session";

export async function authenticate(username: string, password: string): Promise<string | null> {
  const [user] = await db.select().from(users).where(eq(users.username, username)).limit(1);
  if (!user) return null;

  const valid = await verifyPassword(password, user.passwordHash);
  if (!valid) return null;

  return createSessionToken({ userId: user.id, username: user.username });
}
