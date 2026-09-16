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

_(To be filled in as designed.)_

## Profile customization system

_(To be filled in as designed — theme gallery + drag-and-drop image/widget placement
for no-code use, plus a custom-CSS-only advanced mode, scoped/sanitized so one user's
CSS can't break the whole app.)_

## Blog

_(To be filled in as designed — rich posts + comments, Spotify/SoundCloud track search
& embed via API, plus a MySpace-style "profile song" slot separate from post embeds.)_

## Key decisions log

| Decision | Reasoning |
|---|---|
| Next.js full-stack over separate Express API + frontend | Single codebase, simpler deploy, less boilerplate for a 2-user app |
| Cloud Postgres from day one over local SQLite | Wanted multi-device readiness without a later migration step |
| Custom CSS only (not full HTML override) for advanced customization | Keeps page structure consistent/safe while still allowing deep restyling |
| Spotify/SoundCloud via API search-and-attach (not just paste-a-link embed) | Nicer UX, worth the extra integration work |
| No self-serve password reset | Only 2 users; not worth the complexity |
