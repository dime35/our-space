import { eq } from "drizzle-orm";
import { db } from "../../db/client";
import { profiles, users } from "../../db/schema";

export interface ProfileUpdateInput {
  bio?: string;
  profilePictureUrl?: string;
  themeId?: string;
  customCss?: string | null;
  profileSongUrl?: string | null;
}

export async function getProfileByUsername(username: string) {
  const [row] = await db
    .select({
      userId: users.id,
      username: users.username,
      displayName: users.displayName,
      bio: profiles.bio,
      profilePictureUrl: profiles.profilePictureUrl,
      themeId: profiles.themeId,
      customCss: profiles.customCss,
      profileSongUrl: profiles.profileSongUrl,
    })
    .from(users)
    .innerJoin(profiles, eq(profiles.userId, users.id))
    .where(eq(users.username, username))
    .limit(1);
  return row ?? null;
}

export async function updateProfile(userId: number, input: ProfileUpdateInput): Promise<void> {
  await db.update(profiles).set(input).where(eq(profiles.userId, userId));
}
