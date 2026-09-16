import "dotenv/config";
import { eq } from "drizzle-orm";
import { db } from "../src/db/client";
import { users, profiles } from "../src/db/schema";
import { hashPassword } from "../src/lib/auth/password";

interface SeedAccount {
  username: string;
  password: string;
  displayName: string;
}

function requiredEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`${name} must be set to run the seed script`);
  return value;
}

async function seedAccount(account: SeedAccount): Promise<void> {
  const [existing] = await db.select().from(users).where(eq(users.username, account.username)).limit(1);
  if (existing) {
    console.log(`Skipping ${account.username}: already exists`);
    return;
  }

  const passwordHash = await hashPassword(account.password);
  await db.transaction(async (tx) => {
    const [user] = await tx
      .insert(users)
      .values({
        username: account.username,
        passwordHash,
        displayName: account.displayName,
      })
      .returning();
    await tx.insert(profiles).values({ userId: user.id });
  });
  console.log(`Created account: ${account.username}`);
}

async function main() {
  await seedAccount({
    username: requiredEnv("SEED_USER1_USERNAME"),
    password: requiredEnv("SEED_USER1_PASSWORD"),
    displayName: requiredEnv("SEED_USER1_DISPLAY_NAME"),
  });
  await seedAccount({
    username: requiredEnv("SEED_USER2_USERNAME"),
    password: requiredEnv("SEED_USER2_PASSWORD"),
    displayName: requiredEnv("SEED_USER2_DISPLAY_NAME"),
  });
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
