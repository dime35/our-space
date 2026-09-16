# Private MySpace: Profile + Blog Core — Design Spec

Date: 2026-09-16

## Overview

A private, 2-user (you + your girlfriend) reimagining of MySpace: each person gets a
fully customizable profile page (picture, bio, freeform-ish layout) and a blog with
rich posts, comments, and music/video embeds. Retro 2000s aesthetic throughout.

**This spec covers profiles + blog only.** Chat is an explicitly separate feature,
to be brainstormed and specced as its own follow-up project once this core is built.
Hosting/deployment is also deferred — the stack is chosen to deploy cleanly later,
but no deployment work is in scope now.

## Goals

- Two people can each have a personal page: profile picture, bio, fully customizable
  layout/theme, and a blog.
- One person (technical) can hand-write custom CSS; the other (non-technical) can
  fully personalize her page through a visual, no-code theme + drag-and-drop system.
- Blog posts support rich text, images, video, and Spotify track embeds, plus
  comments from the other person.
- Aesthetic is unmistakably retro 2000s MySpace.

## Non-goals (this spec)

- Chat/messaging between the two users.
- Public hosting/deployment configuration.
- Support for more than 2 user accounts, self-serve signup, or password reset flows.
- SoundCloud integration (considered and dropped — API not worth the cost).

## Architecture

- **Framework**: Next.js (React), full-stack — API routes serve as the backend in the
  same codebase as the frontend.
- **Database**: Postgres, hosted on a cloud free tier (Supabase or Neon) from the
  start, so the app is multi-device ready without a later migration.
- **File storage**: Object storage for uploaded images and videos (profile pics, post
  media, background images) — Supabase Storage if Supabase is the DB provider, to
  keep it to one service.
- **Auth**: Username + password, two pre-created accounts only. Sessions via signed
  HTTP-only cookie; passwords hashed with bcrypt. No email verification or self-serve
  password reset — recovery is manual (direct DB edit / admin script).
- **Deployment**: Deferred. Chosen stack (Next.js + Supabase/Neon) deploys cleanly to
  Vercel + Supabase later with minimal changes.

## Data model

- **users**: id, username, password_hash, display_name, created_at
- **profiles** (1:1 with users): user_id, bio, profile_picture_url, theme_id,
  custom_css (nullable, advanced mode), profile_song (Spotify track id/url)
- **profile_layout**: user_id, JSON blob describing placed widgets (type, grid
  position, size, content ref) for the snap-to-grid canvas
- **posts**: id, author_id, title, body (sanitized HTML from rich text editor),
  created_at, updated_at
- **post_media**: post_id, type (`image` | `video_upload` | `video_youtube` | `song`),
  url or track/video reference, position/order within the post
- **comments**: id, post_id, author_id, body, created_at

Rich text is stored as sanitized HTML (via a rich text editor like Tiptap), not
Markdown, matching classic "MySpace post editor" UX.

## Profile customization system

- **Theme gallery**: preset retro 2000s themes (tiled backgrounds, borders, fonts,
  color schemes) either user can pick as a base for their profile.
- **Snap-to-grid canvas**: layered on top of the theme. Users drag widgets (profile
  pic, bio box, blog feed, profile song player, custom image blocks) onto a grid;
  position/size snap to grid cells rather than freeform placement, keeping layouts
  clean and avoiding overlap. Saved as JSON in `profile_layout`.
- **Advanced mode (custom CSS)**: a code box for hand-written custom CSS, applied on
  top of theme + layout. Scoped and sanitized (e.g. via `postcss` + a scoping plugin,
  stripping `@import`, `url(javascript:...)`, etc.) so it cannot leak out and affect
  the rest of the app or inject scripts.
- **Render order**: theme (base styles) → layout JSON (widget positions) → custom CSS
  (final overrides) — combined when rendering a profile page.

## Blog

- **Post editor**: rich text editor (e.g. Tiptap) — title + formatted body (bold,
  links, inline images), saved as sanitized HTML.
- **Media in posts**:
  - Inline images.
  - Inline video — both uploaded video files (stored in object storage) and YouTube
    link embeds.
  - Spotify track embeds — attached via in-app search against the Spotify API
    (server-side proxy), rendered as an inline playable widget.
- **Comments**: every post has a comment thread (`comments` table). Only two users
  exist today, but the model isn't artificially limited to one reply.
- **Profile song**: separate from posts — one featured Spotify track per profile,
  shown as a small player widget placeable on the customizable canvas like any other
  widget.
- **Feed**: each profile's posts render reverse-chronological as one of the placeable
  widgets, positioned/sized within the layout like everything else.

## Error handling & security

- **CSS sanitization**: custom CSS is scoped/sanitized (`postcss` + scoper plugin,
  strip dangerous constructs) before storage and before render.
- **Rich text sanitization**: post/comment HTML sanitized server-side (e.g.
  `sanitize-html`) before storage to prevent stored XSS.
- **File uploads**: validate MIME type and size limits for images/videos before
  accepting into object storage.
- **Auth errors**: generic "invalid username or password" (no username enumeration);
  modest rate-limiting on login attempts.
- **Spotify API**: server-side proxy handles search/token exchange so API
  credentials never reach the client.

## Testing approach

- **Unit tests** (Vitest/Jest): sanitization logic (CSS scoper, HTML sanitizer),
  data layer functions (CRUD for posts/comments/profile), auth helpers (password
  hashing/session validation).
- **Integration tests**: API routes — login flow, post/comment creation, profile
  update, Spotify search proxy — against a test database.
- **Manual/E2E**: the drag-and-drop canvas and live CSS preview are inherently
  visual and get manually verified in-browser. A lightweight Playwright smoke test
  may be added later, but heavy automated E2E coverage isn't worth it for a 2-user
  app.

## Key decisions log

| Decision | Reasoning |
|---|---|
| Next.js full-stack over separate Express API + frontend | Single codebase, simpler deploy, less boilerplate for a 2-user app |
| Cloud Postgres from day one over local SQLite | Multi-device readiness without a later migration step |
| Custom CSS only (not full HTML override) for advanced customization | Keeps page structure consistent/safe while still allowing deep restyling |
| Snap-to-grid canvas over freeform drag-and-drop | Keeps layouts clean, avoids overlap, easier for a non-technical user |
| Spotify via API search-and-attach (not paste-a-link embed) | Nicer UX, worth the extra integration work |
| SoundCloud dropped | API not worth the integration cost |
| Both uploaded video files and YouTube embeds supported | Covers personal clips and shared YouTube content without picking one |
| No self-serve password reset | Only 2 users; not worth the complexity |
| Chat is a separate follow-up project | Keeps this spec focused on the profile/blog core; chat has independent design needs |
