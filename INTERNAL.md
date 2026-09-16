# INTERNAL.md

Living documentation of the codebase, updated as the project is designed and built.
For project overview and setup, see `CLAUDE.md`. This file tracks *how the system is put
together* — architecture, data model, and key decisions — as they're decided/implemented.

## Status

Design phase (brainstorming). No code written yet.

## Scope (first build)

Private, 2-user MySpace clone: profile pages (pic, bio, fully customizable layout/theme)
+ blog (rich posts, comments, Spotify/SoundCloud embeds). Retro 2000s aesthetic.
Chat is an explicitly separate, later project — not in this build.

## Architecture

- **Framework**: Next.js (React), full-stack — API routes serve as the backend, same
  codebase as the frontend.
- **Database**: Postgres, hosted on a cloud free tier (Supabase or Neon) from the start
  (not a local file DB) — chosen so the app is multi-device ready without a later migration.
- **File storage**: Object storage for uploaded images (profile pics, post images,
  background images) — likely Supabase Storage if Supabase is the DB provider, to keep
  it to one service.
- **Auth**: Simple username + password, two pre-created accounts. Sessions via signed
  HTTP-only cookie; passwords hashed with bcrypt. No email verification or self-serve
  password reset — recovery is manual (direct DB edit / admin script) since it's just
  the two of you.
- **Deployment**: Deferred. This stack (Next.js + Supabase/Neon) deploys cleanly to
  Vercel + Supabase later with minimal changes.

## Data model

- **users**: id, username, password_hash, display_name, created_at
- **profiles** (1:1 with users): user_id, bio, profile_picture_url, theme_id,
  custom_css (nullable), profile_song (Spotify track id/url)
- **profile_layout**: user_id, JSON blob of placed widgets (type, grid position,
  size, content ref) for the snap-to-grid canvas
- **posts**: id, author_id, title, body (sanitized HTML), created_at, updated_at
- **post_media**: post_id, type (`image` | `video_upload` | `video_youtube` |
  `song`), url or track/video reference, position/order
- **comments**: id, post_id, author_id, body, created_at

## Profile customization system

- **Theme gallery**: preset retro 2000s themes (backgrounds, borders, fonts, color
  schemes) either user can pick as a base.
- **Snap-to-grid canvas**: layered on the theme. Users drag images/widgets (profile
  pic, bio box, blog feed, profile song player, custom image blocks) onto a grid —
  positions/sizes snap to grid cells (not freeform) to keep layouts clean and avoid
  overlap. Saved as JSON in `profile_layout`.
- **Advanced mode (custom CSS)**: a code box for custom CSS, applied on top of
  theme + layout. Scoped (e.g. wrapped/sanitized via a CSS scoping tool) so it can't
  leak out and affect the rest of the app or inject scripts.
- **Render order**: theme (base styles) → layout JSON (widget positions) → custom CSS
  (final overrides), combined when rendering a profile page.

## Blog

- **Post editor**: rich text editor (e.g. Tiptap) — title + formatted body (bold,
  links, inline images), saved as sanitized HTML.
- **Media in posts**: inline images; inline video (both uploaded video files, stored
  in object storage, and YouTube link embeds); songs attached via Spotify search
  (API) and rendered as an inline playable embed. (SoundCloud dropped — API not
  worth the integration cost.)
- **Comments**: every post has a comment thread (`comments` table), even though
  only two users exist — not artificially limited to one reply.
- **Profile song**: separate from posts — one featured Spotify track per profile,
  shown as a small player widget placeable on the customizable canvas like any
  other widget.
- **Feed**: each profile's posts render reverse-chronological as one of the
  placeable widgets, positioned/sized within the layout like everything else.

## Error handling & security

- **CSS sanitization**: custom CSS run through a scoping/sanitizing step (e.g.
  `postcss` + a scoper plugin, stripping `@import`, `url(javascript:...)`, etc.)
  before storage and before render, so it can't break the nav or other pages.
- **Rich text sanitization**: post/comment HTML sanitized server-side (e.g.
  `sanitize-html`) before storage to prevent stored XSS.
- **File uploads**: validate MIME type + size limits for images/videos before
  accepting into object storage.
- **Auth errors**: generic "invalid username or password" (no username
  enumeration), modest rate-limiting on login attempts.
- **Spotify API**: server-side proxy for search/token handling so API credentials
  never reach the client.

## Key decisions log

| Decision | Reasoning |
|---|---|
| Next.js full-stack over separate Express API + frontend | Single codebase, simpler deploy, less boilerplate for a 2-user app |
| Cloud Postgres from day one over local SQLite | Wanted multi-device readiness without a later migration step |
| Custom CSS only (not full HTML override) for advanced customization | Keeps page structure consistent/safe while still allowing deep restyling |
| Snap-to-grid canvas over freeform drag-and-drop | Keeps layouts clean, avoids overlap, easier for a non-technical user |
| Spotify via API search-and-attach (not paste-a-link embed) | Nicer UX, worth the extra integration work |
| SoundCloud dropped | API not worth the integration cost |
| Both uploaded video files and YouTube embeds supported | Covers personal clips and shared YouTube content without picking one |
| No self-serve password reset | Only 2 users; not worth the complexity |
| Chat is a separate follow-up project | Keeps this spec focused on the profile/blog core; chat has independent design needs |
