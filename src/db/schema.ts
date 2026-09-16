import { pgTable, serial, text, timestamp, integer, jsonb, varchar } from "drizzle-orm/pg-core";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: varchar("username", { length: 64 }).notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  displayName: varchar("display_name", { length: 128 }).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const profiles = pgTable("profiles", {
  userId: integer("user_id").primaryKey().references(() => users.id),
  bio: text("bio").default("").notNull(),
  profilePictureUrl: text("profile_picture_url"),
  themeId: varchar("theme_id", { length: 64 }).default("classic").notNull(),
  customCss: text("custom_css"),
  profileSongUrl: text("profile_song_url"),
});

export const profileLayouts = pgTable("profile_layouts", {
  userId: integer("user_id").primaryKey().references(() => users.id),
  widgets: jsonb("widgets").notNull().default([]),
});

export const posts = pgTable("posts", {
  id: serial("id").primaryKey(),
  authorId: integer("author_id").notNull().references(() => users.id),
  title: varchar("title", { length: 256 }).notNull(),
  body: text("body").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const postMedia = pgTable("post_media", {
  id: serial("id").primaryKey(),
  postId: integer("post_id").notNull().references(() => posts.id),
  type: varchar("type", { length: 16 }).notNull(),
  url: text("url").notNull(),
  position: integer("position").notNull().default(0),
});

export const comments = pgTable("comments", {
  id: serial("id").primaryKey(),
  postId: integer("post_id").notNull().references(() => posts.id),
  authorId: integer("author_id").notNull().references(() => users.id),
  body: text("body").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});
