import { eq } from "drizzle-orm";
import { db } from "../../db/client";
import { profileLayouts } from "../../db/schema";

export interface Widget {
  id: string;
  type: string;
  col: number;
  row: number;
  width: number;
  height: number;
  contentRef?: string;
}

export async function getLayout(userId: number): Promise<Widget[]> {
  const [row] = await db.select().from(profileLayouts).where(eq(profileLayouts.userId, userId)).limit(1);
  return (row?.widgets as Widget[]) ?? [];
}

export async function saveLayout(userId: number, widgets: Widget[]): Promise<void> {
  await db
    .insert(profileLayouts)
    .values({ userId, widgets })
    .onConflictDoUpdate({ target: profileLayouts.userId, set: { widgets } });
}
