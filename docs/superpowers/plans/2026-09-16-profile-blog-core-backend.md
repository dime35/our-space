# Profile + Blog Core — Backend Foundation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the data model, auth, and API layer for the private 2-user MySpace
clone's profile + blog core — a fully working, independently testable backend that
a frontend can be built against next.

**Architecture:** Next.js (App Router) API routes backed by Postgres via Drizzle ORM.
Business logic lives in framework-independent `src/lib/**` modules with their own
unit/integration tests; API routes in `src/app/api/**` are thin wrappers that parse
requests, call into `src/lib`, and shape responses. Auth is a signed HMAC cookie, not
a session table. Sanitization (HTML via `sanitize-html`, CSS via `postcss`) happens
at the boundary before anything is persisted.

**Tech Stack:** Next.js 14 (App Router, TypeScript), Postgres (Neon/Supabase),
`drizzle-orm` + `drizzle-kit`, `postgres` (porsager) driver, `bcryptjs`,
`sanitize-html`, `postcss` + `postcss-prefix-selector`, Vitest, `tsx` (seed script).

**Spec:** `docs/superpowers/specs/2026-09-16-profile-blog-core-design.md`

## Global Constraints

- Two user accounts only, created via seed script — no self-serve signup (spec: Auth).
- Passwords hashed with bcrypt; sessions are signed HTTP-only cookies (spec:
  Architecture, Error handling & security).
- All post/comment HTML sanitized server-side before storage (spec: Error handling
  & security — Rich text sanitization).
- Custom CSS scoped and sanitized (strip `@import`, `javascript:`, `expression()`,
  `behavior:`) before storage and before render (spec: Error handling & security —
  CSS sanitization).
- Auth failures return a generic "Invalid username or password" — no username
  enumeration (spec: Error handling & security — Auth errors).
- Spotify credentials never reach the client — search goes through a server-side
  proxy (spec: Error handling & security — Spotify API).
- `post_media.type` is one of `image | video_upload | video_youtube | song` (spec:
  Data model).

## Out of scope for this plan

Drag-and-drop canvas UI, theme gallery UI, rich text editor UI, object storage
upload wiring for images/video files. These are covered by a follow-up frontend
plan built against the API this plan produces. `profile_layout` and `post_media`
data layers/APIs are built here so the frontend has something to call; actual file
upload handling (presigned URLs, storage bucket config) is also follow-up work,
since it depends on which storage provider is finalized at hosting time.

---

## File Structure

- `package.json`, `tsconfig.json`, `next.config.mjs`, `vitest.config.ts`,
  `drizzle.config.ts`, `.env.example`, `.gitignore` — project scaffold/config.
- `src/db/schema.ts` — Drizzle table definitions (single source of truth for schema).
- `src/db/client.ts` — Drizzle client, reads `DATABASE_URL`.
- `src/lib/auth/password.ts` — hash/verify passwords.
- `src/lib/auth/session.ts` — sign/verify session tokens.
- `src/lib/auth/require-session.ts` — pure token → session payload guard.
- `src/lib/auth/authenticate.ts` — username+password → session token (DB-backed).
- `src/lib/sanitize/html.ts` — sanitize rich text HTML.
- `src/lib/sanitize/css.ts` — sanitize + scope custom CSS.
- `src/lib/profiles/repository.ts` — profile CRUD.
- `src/lib/layout/repository.ts` — profile_layout CRUD.
- `src/lib/posts/repository.ts` — post CRUD.
- `src/lib/posts/media-repository.ts` — post_media CRUD.
- `src/lib/comments/repository.ts` — comment CRUD (sanitizes on write).
- `src/lib/spotify/client.ts` — Spotify token exchange + track search.
- `src/app/api/auth/login/route.ts`, `.../logout/route.ts`
- `src/app/api/profile/[username]/route.ts`, `.../layout/route.ts`
- `src/app/api/posts/route.ts`, `.../[id]/route.ts`, `.../[id]/media/route.ts`,
  `.../[id]/comments/route.ts`
- `src/app/api/spotify/search/route.ts`
- `scripts/seed.ts` — creates the two user accounts.
- `tests/**` — mirrors `src/lib/**` structure, one test file per module.

Each `src/lib/**` module owns one table (or one cross-cutting concern like auth/
sanitize) and has no knowledge of Next.js request/response types — that keeps them
independently testable and reusable if API routes are later restructured.

## Global Setup Notes (apply once, referenced by Task 1)

- Tests that hit Postgres (`tests/lib/**` for repository/auth modules) run against
  a real test database pointed to by `DATABASE_URL` in `.env.test` — not mocked.
  This matches the spec's testing approach (integration tests against a test
  database) and catches real SQL/constraint bugs.
- Every DB-backed test file truncates the tables it touches in an `afterEach` hook
  so tests stay independent and repeatable.

---

### Task 1: Project scaffold and toolchain

**Files:**
- Create: `package.json`
- Create: `tsconfig.json`
- Create: `next.config.mjs`
- Create: `vitest.config.ts`
- Create: `drizzle.config.ts`
- Create: `.env.example`
- Create: `.gitignore`
- Create: `src/app/layout.tsx`
- Create: `src/app/page.tsx`
- Test: `tests/smoke.test.ts`

**Interfaces:**
- Produces: a working `npm test`, `npm run build`, and `npm run dev` toolchain that
  every later task relies on.

- [ ] **Step 1: Write `package.json`**

```json
{
  "name": "our-space",
  "private": true,
  "version": "0.1.0",
  "type": "module",
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "test": "vitest run",
    "db:push": "drizzle-kit push",
    "seed": "tsx scripts/seed.ts"
  },
  "dependencies": {
    "next": "14.2.5",
    "react": "18.3.1",
    "react-dom": "18.3.1",
    "drizzle-orm": "0.33.0",
    "postgres": "3.4.4",
    "bcryptjs": "2.4.3",
    "sanitize-html": "2.13.0",
    "postcss": "8.4.41",
    "postcss-prefix-selector": "1.16.1"
  },
  "devDependencies": {
    "typescript": "5.5.4",
    "@types/node": "20.14.15",
    "@types/react": "18.3.3",
    "@types/bcryptjs": "2.4.6",
    "@types/sanitize-html": "2.13.0",
    "drizzle-kit": "0.24.0",
    "vitest": "2.0.5",
    "tsx": "4.16.5",
    "dotenv": "16.4.5"
  }
}
```

- [ ] **Step 2: Write `tsconfig.json`**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "lib": ["dom", "ES2022"],
    "module": "ESNext",
    "moduleResolution": "Bundler",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "jsx": "preserve",
    "incremental": true,
    "noEmit": true,
    "plugins": [{ "name": "next" }],
    "paths": { "@/*": ["./src/*"] }
  },
  "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx"],
  "exclude": ["node_modules"]
}
```

- [ ] **Step 3: Write `next.config.mjs`**

```js
/** @type {import('next').NextConfig} */
const nextConfig = {};
export default nextConfig;
```

- [ ] **Step 4: Write `vitest.config.ts`**

```ts
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    include: ["tests/**/*.test.ts"],
    setupFiles: ["dotenv/config"],
  },
});
```

- [ ] **Step 5: Write `drizzle.config.ts`**

```ts
import "dotenv/config";
import type { Config } from "drizzle-kit";

export default {
  schema: "./src/db/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
} satisfies Config;
```

- [ ] **Step 6: Write `.env.example`**

```
DATABASE_URL=postgres://user:password@host:5432/our_space
SESSION_SECRET=replace-with-a-long-random-string
SPOTIFY_CLIENT_ID=
SPOTIFY_CLIENT_SECRET=
```

Copy this to `.env` (dev) and `.env.test` (pointing at a separate test database)
before running the app or tests.

- [ ] **Step 7: Write `.gitignore`**

```
node_modules/
.next/
.env
.env.test
drizzle/
```

- [ ] **Step 8: Write minimal app shell**

`src/app/layout.tsx`:
```tsx
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
```

`src/app/page.tsx`:
```tsx
export default function HomePage() {
  return <main>our-space</main>;
}
```

- [ ] **Step 9: Write a smoke test**

`tests/smoke.test.ts`:
```ts
import { describe, it, expect } from "vitest";

describe("toolchain", () => {
  it("runs a test", () => {
    expect(1 + 1).toBe(2);
  });
});
```

- [ ] **Step 10: Install dependencies and verify**

Run: `npm install`
Run: `npm test`
Expected: `tests/smoke.test.ts` passes.

Run: `npm run build`
Expected: build succeeds (route `/` compiles).

- [ ] **Step 11: Commit**

```bash
git add package.json package-lock.json tsconfig.json next.config.mjs vitest.config.ts drizzle.config.ts .env.example .gitignore src/app tests/smoke.test.ts
git commit -m "chore: scaffold Next.js + TypeScript + Vitest toolchain"
```

---

### Task 2: Database schema and client

**Files:**
- Create: `src/db/schema.ts`
- Create: `src/db/client.ts`
- Test: `tests/db/client.test.ts`

**Interfaces:**
- Consumes: `DATABASE_URL` from env (Task 1's `.env`/`.env.test`).
- Produces: `db` (Drizzle client) and table objects `users`, `profiles`,
  `profileLayouts`, `posts`, `postMedia`, `comments` — every later `src/lib/**`
  module imports these exact names from `src/db/schema.ts` and `src/db/client.ts`.

- [ ] **Step 1: Write the schema**

`src/db/schema.ts`:
```ts
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
```

- [ ] **Step 2: Write the client**

`src/db/client.ts`:
```ts
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error("DATABASE_URL is not set");
}

const queryClient = postgres(connectionString);
export const db = drizzle(queryClient, { schema });
```

- [ ] **Step 3: Write a failing test**

`tests/db/client.test.ts`:
```ts
import { describe, it, expect } from "vitest";
import { sql } from "drizzle-orm";
import { db } from "../../src/db/client";

describe("db client", () => {
  it("connects and can run a trivial query", async () => {
    const result = await db.execute(sql`select 1 as one`);
    expect(result[0].one).toBe(1);
  });
});
```

- [ ] **Step 4: Push schema to the test database and run the test**

Run: `DATABASE_URL=$(grep DATABASE_URL .env.test | cut -d= -f2-) npx drizzle-kit push`
Expected: tables created in the test database.

Run: `npm test -- tests/db/client.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/db tests/db/client.test.ts
git commit -m "feat: add Drizzle schema and database client"
```

---

### Task 3: Password hashing

**Files:**
- Create: `src/lib/auth/password.ts`
- Test: `tests/lib/auth/password.test.ts`

**Interfaces:**
- Produces: `hashPassword(plain: string): Promise<string>`,
  `verifyPassword(plain: string, hash: string): Promise<boolean>` — used by
  `authenticate.ts` (Task 5) and `scripts/seed.ts` (Task 17).

- [ ] **Step 1: Write the failing test**

`tests/lib/auth/password.test.ts`:
```ts
import { describe, it, expect } from "vitest";
import { hashPassword, verifyPassword } from "../../../src/lib/auth/password";

describe("password hashing", () => {
  it("verifies a correct password against its hash", async () => {
    const hash = await hashPassword("correct-horse-battery-staple");
    expect(await verifyPassword("correct-horse-battery-staple", hash)).toBe(true);
  });

  it("rejects an incorrect password", async () => {
    const hash = await hashPassword("correct-horse-battery-staple");
    expect(await verifyPassword("wrong-password", hash)).toBe(false);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- tests/lib/auth/password.test.ts`
Expected: FAIL — `Cannot find module '../../../src/lib/auth/password'`.

- [ ] **Step 3: Write the implementation**

`src/lib/auth/password.ts`:
```ts
import bcrypt from "bcryptjs";

const SALT_ROUNDS = 10;

export async function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, SALT_ROUNDS);
}

export async function verifyPassword(plain: string, hash: string): Promise<boolean> {
  return bcrypt.compare(plain, hash);
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- tests/lib/auth/password.test.ts`
Expected: PASS (2 tests).

- [ ] **Step 5: Commit**

```bash
git add src/lib/auth/password.ts tests/lib/auth/password.test.ts
git commit -m "feat: add password hashing utility"
```

---

### Task 4: Session tokens

**Files:**
- Create: `src/lib/auth/session.ts`
- Test: `tests/lib/auth/session.test.ts`

**Interfaces:**
- Consumes: `process.env.SESSION_SECRET`.
- Produces: `SessionPayload { userId: number; username: string }`,
  `createSessionToken(payload: SessionPayload): string`,
  `verifySessionToken(token: string): SessionPayload | null`,
  `SESSION_COOKIE: { name: string; maxAge: number }` — used by
  `authenticate.ts` (Task 5), `require-session.ts` (Task 6), and the login/logout
  routes (Task 7).

- [ ] **Step 1: Write the failing test**

`tests/lib/auth/session.test.ts`:
```ts
import { describe, it, expect, beforeAll } from "vitest";
import { createSessionToken, verifySessionToken } from "../../../src/lib/auth/session";

beforeAll(() => {
  process.env.SESSION_SECRET = "test-secret";
});

describe("session tokens", () => {
  it("round-trips a valid payload", () => {
    const token = createSessionToken({ userId: 1, username: "dime35" });
    expect(verifySessionToken(token)).toEqual({ userId: 1, username: "dime35" });
  });

  it("rejects a tampered token", () => {
    const token = createSessionToken({ userId: 1, username: "dime35" });
    const tampered = token.slice(0, -1) + (token.at(-1) === "a" ? "b" : "a");
    expect(verifySessionToken(tampered)).toBeNull();
  });

  it("rejects a malformed token", () => {
    expect(verifySessionToken("not-a-real-token")).toBeNull();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- tests/lib/auth/session.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Write the implementation**

`src/lib/auth/session.ts`:
```ts
import crypto from "node:crypto";

const SESSION_COOKIE_NAME = "session";
const MAX_AGE_SECONDS = 60 * 60 * 24 * 30;

export interface SessionPayload {
  userId: number;
  username: string;
}

function getSecret(): string {
  const secret = process.env.SESSION_SECRET;
  if (!secret) throw new Error("SESSION_SECRET is not set");
  return secret;
}

function sign(data: string): string {
  return crypto.createHmac("sha256", getSecret()).update(data).digest("base64url");
}

export function createSessionToken(payload: SessionPayload): string {
  const data = Buffer.from(JSON.stringify(payload)).toString("base64url");
  return `${data}.${sign(data)}`;
}

export function verifySessionToken(token: string): SessionPayload | null {
  const [data, signature] = token.split(".");
  if (!data || !signature) return null;

  const expected = sign(data);
  const sigBuf = Buffer.from(signature);
  const expBuf = Buffer.from(expected);
  if (sigBuf.length !== expBuf.length || !crypto.timingSafeEqual(sigBuf, expBuf)) {
    return null;
  }

  try {
    return JSON.parse(Buffer.from(data, "base64url").toString("utf8"));
  } catch {
    return null;
  }
}

export const SESSION_COOKIE = { name: SESSION_COOKIE_NAME, maxAge: MAX_AGE_SECONDS };
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- tests/lib/auth/session.test.ts`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add src/lib/auth/session.ts tests/lib/auth/session.test.ts
git commit -m "feat: add signed session token utility"
```

---

### Task 5: Authenticate against the database

**Files:**
- Create: `src/lib/auth/authenticate.ts`
- Test: `tests/lib/auth/authenticate.test.ts`

**Interfaces:**
- Consumes: `db`, `users` (Task 2); `hashPassword`, `verifyPassword` (Task 3);
  `createSessionToken`, `SessionPayload` (Task 4).
- Produces: `authenticate(username: string, password: string): Promise<string | null>`
  — used by the login route (Task 7).

- [ ] **Step 1: Write the failing test**

`tests/lib/auth/authenticate.test.ts`:
```ts
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { db } from "../../../src/db/client";
import { users } from "../../../src/db/schema";
import { hashPassword } from "../../../src/lib/auth/password";
import { verifySessionToken } from "../../../src/lib/auth/session";
import { authenticate } from "../../../src/lib/auth/authenticate";

beforeEach(async () => {
  await db.insert(users).values({
    username: "testuser",
    passwordHash: await hashPassword("hunter2"),
    displayName: "Test User",
  });
});

afterEach(async () => {
  await db.delete(users);
});

describe("authenticate", () => {
  it("returns a valid session token for correct credentials", async () => {
    const token = await authenticate("testuser", "hunter2");
    expect(token).not.toBeNull();
    expect(verifySessionToken(token!)?.username).toBe("testuser");
  });

  it("returns null for a wrong password", async () => {
    expect(await authenticate("testuser", "wrong")).toBeNull();
  });

  it("returns null for an unknown username", async () => {
    expect(await authenticate("nobody", "hunter2")).toBeNull();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- tests/lib/auth/authenticate.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Write the implementation**

`src/lib/auth/authenticate.ts`:
```ts
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
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- tests/lib/auth/authenticate.test.ts`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add src/lib/auth/authenticate.ts tests/lib/auth/authenticate.test.ts
git commit -m "feat: add database-backed authentication"
```

---

### Task 6: Session guard

**Files:**
- Create: `src/lib/auth/require-session.ts`
- Test: `tests/lib/auth/require-session.test.ts`

**Interfaces:**
- Consumes: `verifySessionToken`, `SessionPayload` (Task 4).
- Produces: `requireSession(token: string | undefined): SessionPayload | null` —
  used by every protected API route from Task 8 onward.

- [ ] **Step 1: Write the failing test**

`tests/lib/auth/require-session.test.ts`:
```ts
import { describe, it, expect, beforeAll } from "vitest";
import { createSessionToken } from "../../../src/lib/auth/session";
import { requireSession } from "../../../src/lib/auth/require-session";

beforeAll(() => {
  process.env.SESSION_SECRET = "test-secret";
});

describe("requireSession", () => {
  it("returns the payload for a valid token", () => {
    const token = createSessionToken({ userId: 2, username: "gf" });
    expect(requireSession(token)).toEqual({ userId: 2, username: "gf" });
  });

  it("returns null when no token is present", () => {
    expect(requireSession(undefined)).toBeNull();
  });

  it("returns null for an invalid token", () => {
    expect(requireSession("garbage")).toBeNull();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- tests/lib/auth/require-session.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Write the implementation**

`src/lib/auth/require-session.ts`:
```ts
import { SessionPayload, verifySessionToken } from "./session";

export function requireSession(token: string | undefined): SessionPayload | null {
  if (!token) return null;
  return verifySessionToken(token);
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- tests/lib/auth/require-session.test.ts`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add src/lib/auth/require-session.ts tests/lib/auth/require-session.test.ts
git commit -m "feat: add session guard helper"
```

---

### Task 7: Login and logout API routes

**Files:**
- Create: `src/app/api/auth/login/route.ts`
- Create: `src/app/api/auth/logout/route.ts`
- Test: `tests/app/api/auth/login.test.ts`

**Interfaces:**
- Consumes: `authenticate` (Task 5), `SESSION_COOKIE` (Task 4).
- Produces: `POST /api/auth/login` (sets `session` cookie), `POST /api/auth/logout`
  (clears it) — the frontend login form (follow-up plan) calls these directly.

- [ ] **Step 1: Write the failing test**

`tests/app/api/auth/login.test.ts`:
```ts
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { NextRequest } from "next/server";
import { db } from "../../../../src/db/client";
import { users } from "../../../../src/db/schema";
import { hashPassword } from "../../../../src/lib/auth/password";
import { POST as login } from "../../../../src/app/api/auth/login/route";

beforeEach(async () => {
  await db.insert(users).values({
    username: "testuser",
    passwordHash: await hashPassword("hunter2"),
    displayName: "Test User",
  });
});

afterEach(async () => {
  await db.delete(users);
});

function jsonRequest(body: unknown) {
  return new NextRequest("http://localhost/api/auth/login", {
    method: "POST",
    body: JSON.stringify(body),
    headers: { "Content-Type": "application/json" },
  });
}

describe("POST /api/auth/login", () => {
  it("sets a session cookie for correct credentials", async () => {
    const response = await login(jsonRequest({ username: "testuser", password: "hunter2" }));
    expect(response.status).toBe(200);
    expect(response.cookies.get("session")?.value).toBeTruthy();
  });

  it("returns 401 with a generic message for wrong credentials", async () => {
    const response = await login(jsonRequest({ username: "testuser", password: "wrong" }));
    expect(response.status).toBe(401);
    const body = await response.json();
    expect(body.error).toBe("Invalid username or password");
  });

  it("returns 400 when fields are missing", async () => {
    const response = await login(jsonRequest({ username: "testuser" }));
    expect(response.status).toBe(400);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- tests/app/api/auth/login.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Write the implementation**

`src/app/api/auth/login/route.ts`:
```ts
import { NextRequest, NextResponse } from "next/server";
import { authenticate } from "../../../../lib/auth/authenticate";
import { SESSION_COOKIE } from "../../../../lib/auth/session";

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
  if (!body?.username || !body?.password) {
    return NextResponse.json({ error: "Username and password are required" }, { status: 400 });
  }

  const token = await authenticate(body.username, body.password);
  if (!token) {
    return NextResponse.json({ error: "Invalid username or password" }, { status: 401 });
  }

  const response = NextResponse.json({ ok: true });
  response.cookies.set(SESSION_COOKIE.name, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: SESSION_COOKIE.maxAge,
    path: "/",
  });
  return response;
}
```

`src/app/api/auth/logout/route.ts`:
```ts
import { NextResponse } from "next/server";
import { SESSION_COOKIE } from "../../../../lib/auth/session";

export async function POST() {
  const response = NextResponse.json({ ok: true });
  response.cookies.set(SESSION_COOKIE.name, "", { maxAge: 0, path: "/" });
  return response;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- tests/app/api/auth/login.test.ts`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add src/app/api/auth tests/app/api/auth/login.test.ts
git commit -m "feat: add login and logout API routes"
```

---

### Task 8: HTML sanitizer

**Files:**
- Create: `src/lib/sanitize/html.ts`
- Test: `tests/lib/sanitize/html.test.ts`

**Interfaces:**
- Produces: `sanitizePostHtml(dirty: string): string` — used by
  `comments/repository.ts` (Task 12) and the posts API route (Task 11).

- [ ] **Step 1: Write the failing test**

`tests/lib/sanitize/html.test.ts`:
```ts
import { describe, it, expect } from "vitest";
import { sanitizePostHtml } from "../../../src/lib/sanitize/html";

describe("sanitizePostHtml", () => {
  it("strips script tags", () => {
    expect(sanitizePostHtml("<p>hi</p><script>alert(1)</script>")).toBe("<p>hi</p>");
  });

  it("keeps allowed formatting tags", () => {
    expect(sanitizePostHtml("<p><b>bold</b> and <i>italic</i></p>")).toBe(
      "<p><b>bold</b> and <i>italic</i></p>"
    );
  });

  it("strips javascript: URLs from links", () => {
    const result = sanitizePostHtml('<a href="javascript:alert(1)">click</a>');
    expect(result).not.toContain("javascript:");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- tests/lib/sanitize/html.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Write the implementation**

`src/lib/sanitize/html.ts`:
```ts
import sanitizeHtml from "sanitize-html";

export function sanitizePostHtml(dirty: string): string {
  return sanitizeHtml(dirty, {
    allowedTags: [
      "p", "br", "b", "strong", "i", "em", "u", "a",
      "ul", "ol", "li", "blockquote", "img", "h1", "h2", "h3",
    ],
    allowedAttributes: {
      a: ["href", "target", "rel"],
      img: ["src", "alt"],
    },
    allowedSchemes: ["http", "https", "mailto"],
    transformTags: {
      a: sanitizeHtml.simpleTransform("a", { rel: "noopener noreferrer", target: "_blank" }),
    },
  });
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- tests/lib/sanitize/html.test.ts`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add src/lib/sanitize/html.ts tests/lib/sanitize/html.test.ts
git commit -m "feat: add rich text HTML sanitizer"
```

---

### Task 9: CSS sanitizer and scoper

**Files:**
- Create: `src/lib/sanitize/css.ts`
- Test: `tests/lib/sanitize/css.test.ts`

**Interfaces:**
- Produces: `sanitizeAndScopeCss(rawCss: string): string`,
  `PROFILE_CUSTOM_CSS_SCOPE_CLASS: string` — used by the profile API route
  (Task 10); the frontend (follow-up plan) wraps rendered profiles in an element
  carrying `PROFILE_CUSTOM_CSS_SCOPE_CLASS`.

- [ ] **Step 1: Write the failing test**

`tests/lib/sanitize/css.test.ts`:
```ts
import { describe, it, expect } from "vitest";
import { sanitizeAndScopeCss } from "../../../src/lib/sanitize/css";

describe("sanitizeAndScopeCss", () => {
  it("scopes a selector under the profile custom-css class", () => {
    const result = sanitizeAndScopeCss(".title { color: hotpink; }");
    expect(result).toContain(".profile-custom-css .title");
    expect(result).toContain("color: hotpink");
  });

  it("strips @import rules", () => {
    const result = sanitizeAndScopeCss('@import url("evil.css"); .title { color: red; }');
    expect(result).not.toContain("@import");
  });

  it("strips javascript: expressions", () => {
    const result = sanitizeAndScopeCss(".x { background: url(javascript:alert(1)); }");
    expect(result).not.toContain("javascript:");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- tests/lib/sanitize/css.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Write the implementation**

`src/lib/sanitize/css.ts`:
```ts
import postcss from "postcss";
import prefixSelector from "postcss-prefix-selector";

export const PROFILE_CUSTOM_CSS_SCOPE_CLASS = "profile-custom-css";
const DANGEROUS_PATTERN = /@import[^;]*;|expression\s*\([^)]*\)|javascript:[^)'"]*|behavior\s*:[^;]*;/gi;

export function sanitizeAndScopeCss(rawCss: string): string {
  const stripped = rawCss.replace(DANGEROUS_PATTERN, "");
  const result = postcss([
    prefixSelector({
      prefix: `.${PROFILE_CUSTOM_CSS_SCOPE_CLASS}`,
      transform(prefix, _selector, prefixedSelector) {
        return prefixedSelector;
      },
    }),
  ]).process(stripped, { from: undefined });
  return result.css;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- tests/lib/sanitize/css.test.ts`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add src/lib/sanitize/css.ts tests/lib/sanitize/css.test.ts
git commit -m "feat: add custom CSS sanitizer and scoper"
```

---

### Task 10: Profile repository and API route

**Files:**
- Create: `src/lib/profiles/repository.ts`
- Create: `src/app/api/profile/[username]/route.ts`
- Test: `tests/lib/profiles/repository.test.ts`
- Test: `tests/app/api/profile/route.test.ts`

**Interfaces:**
- Consumes: `db`, `users`, `profiles` (Task 2); `sanitizeAndScopeCss` (Task 9);
  `requireSession` (Task 6).
- Produces: `getProfileByUsername(username: string)`,
  `updateProfile(userId: number, input: ProfileUpdateInput)` — used by the layout
  route (Task 11 depends on the same auth pattern, not this repo directly) and by
  the frontend (follow-up plan) via `GET/PATCH /api/profile/[username]`.

- [ ] **Step 1: Write the failing repository test**

`tests/lib/profiles/repository.test.ts`:
```ts
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
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- tests/lib/profiles/repository.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Write the repository implementation**

`src/lib/profiles/repository.ts`:
```ts
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
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- tests/lib/profiles/repository.test.ts`
Expected: PASS (3 tests).

- [ ] **Step 5: Write the failing API route test**

`tests/app/api/profile/route.test.ts`:
```ts
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { NextRequest } from "next/server";
import { db } from "../../../../src/db/client";
import { users, profiles } from "../../../../src/db/schema";
import { createSessionToken } from "../../../../src/lib/auth/session";
import { GET, PATCH } from "../../../../src/app/api/profile/[username]/route";

let userId: number;
let token: string;

beforeEach(async () => {
  process.env.SESSION_SECRET = "test-secret";
  const [user] = await db
    .insert(users)
    .values({ username: "testuser", passwordHash: "x", displayName: "Test User" })
    .returning();
  userId = user.id;
  await db.insert(profiles).values({ userId, bio: "hello" });
  token = createSessionToken({ userId, username: "testuser" });
});

afterEach(async () => {
  await db.delete(profiles);
  await db.delete(users);
});

describe("GET /api/profile/[username]", () => {
  it("returns the profile", async () => {
    const response = await GET(new NextRequest("http://localhost/api/profile/testuser"), {
      params: { username: "testuser" },
    });
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.bio).toBe("hello");
  });

  it("returns 404 for an unknown username", async () => {
    const response = await GET(new NextRequest("http://localhost/api/profile/nobody"), {
      params: { username: "nobody" },
    });
    expect(response.status).toBe(404);
  });
});

describe("PATCH /api/profile/[username]", () => {
  it("rejects unauthenticated requests", async () => {
    const request = new NextRequest("http://localhost/api/profile/testuser", {
      method: "PATCH",
      body: JSON.stringify({ bio: "new bio" }),
    });
    const response = await PATCH(request, { params: { username: "testuser" } });
    expect(response.status).toBe(401);
  });

  it("updates the profile and scopes custom CSS for the owner", async () => {
    const request = new NextRequest("http://localhost/api/profile/testuser", {
      method: "PATCH",
      headers: { cookie: `session=${token}` },
      body: JSON.stringify({ bio: "new bio", customCss: ".x { color: red; }" }),
    });
    const response = await PATCH(request, { params: { username: "testuser" } });
    expect(response.status).toBe(200);

    const check = await GET(new NextRequest("http://localhost/api/profile/testuser"), {
      params: { username: "testuser" },
    });
    const body = await check.json();
    expect(body.bio).toBe("new bio");
    expect(body.customCss).toContain(".profile-custom-css .x");
  });
});
```

- [ ] **Step 6: Run test to verify it fails**

Run: `npm test -- tests/app/api/profile/route.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 7: Write the API route implementation**

`src/app/api/profile/[username]/route.ts`:
```ts
import { NextRequest, NextResponse } from "next/server";
import { getProfileByUsername, updateProfile } from "../../../../lib/profiles/repository";
import { requireSession } from "../../../../lib/auth/require-session";
import { sanitizeAndScopeCss } from "../../../../lib/sanitize/css";

export async function GET(_request: NextRequest, { params }: { params: { username: string } }) {
  const profile = await getProfileByUsername(params.username);
  if (!profile) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  return NextResponse.json(profile);
}

export async function PATCH(request: NextRequest, { params }: { params: { username: string } }) {
  const session = requireSession(request.cookies.get("session")?.value);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const profile = await getProfileByUsername(params.username);
  if (!profile || profile.userId !== session.userId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  if (!body) {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  const update: Record<string, unknown> = {};
  if (typeof body.bio === "string") update.bio = body.bio;
  if (typeof body.profilePictureUrl === "string") update.profilePictureUrl = body.profilePictureUrl;
  if (typeof body.themeId === "string") update.themeId = body.themeId;
  if (typeof body.profileSongUrl === "string") update.profileSongUrl = body.profileSongUrl;
  if (typeof body.customCss === "string") update.customCss = sanitizeAndScopeCss(body.customCss);

  await updateProfile(session.userId, update);
  return NextResponse.json({ ok: true });
}
```

- [ ] **Step 8: Run test to verify it passes**

Run: `npm test -- tests/app/api/profile/route.test.ts`
Expected: PASS (4 tests).

- [ ] **Step 9: Commit**

```bash
git add src/lib/profiles src/app/api/profile/[username]/route.ts tests/lib/profiles tests/app/api/profile/route.test.ts
git commit -m "feat: add profile repository and API route"
```

---

### Task 11: Profile layout repository and API route

**Files:**
- Create: `src/lib/layout/repository.ts`
- Create: `src/app/api/profile/[username]/layout/route.ts`
- Test: `tests/lib/layout/repository.test.ts`
- Test: `tests/app/api/profile/layout.test.ts`

**Interfaces:**
- Consumes: `db`, `profileLayouts` (Task 2); `requireSession` (Task 6);
  `getProfileByUsername` (Task 10, to resolve username → userId and enforce
  ownership).
- Produces: `Widget { id: string; type: string; col: number; row: number; width:
  number; height: number; contentRef?: string }`, `getLayout(userId: number):
  Promise<Widget[]>`, `saveLayout(userId: number, widgets: Widget[]):
  Promise<void>` — used by the frontend canvas (follow-up plan) via
  `GET/PUT /api/profile/[username]/layout`.

- [ ] **Step 1: Write the failing repository test**

`tests/lib/layout/repository.test.ts`:
```ts
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
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- tests/lib/layout/repository.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Write the repository implementation**

`src/lib/layout/repository.ts`:
```ts
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
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- tests/lib/layout/repository.test.ts`
Expected: PASS (3 tests).

- [ ] **Step 5: Write the failing API route test**

`tests/app/api/profile/layout.test.ts`:
```ts
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { NextRequest } from "next/server";
import { db } from "../../../../src/db/client";
import { users, profiles, profileLayouts } from "../../../../src/db/schema";
import { createSessionToken } from "../../../../src/lib/auth/session";
import { GET, PUT } from "../../../../src/app/api/profile/[username]/layout/route";

let userId: number;
let token: string;

beforeEach(async () => {
  process.env.SESSION_SECRET = "test-secret";
  const [user] = await db
    .insert(users)
    .values({ username: "testuser", passwordHash: "x", displayName: "Test User" })
    .returning();
  userId = user.id;
  await db.insert(profiles).values({ userId });
  token = createSessionToken({ userId, username: "testuser" });
});

afterEach(async () => {
  await db.delete(profileLayouts);
  await db.delete(profiles);
  await db.delete(users);
});

describe("GET /api/profile/[username]/layout", () => {
  it("returns an empty layout initially", async () => {
    const response = await GET(new NextRequest("http://localhost/x"), { params: { username: "testuser" } });
    expect(await response.json()).toEqual({ widgets: [] });
  });
});

describe("PUT /api/profile/[username]/layout", () => {
  it("rejects unauthenticated requests", async () => {
    const request = new NextRequest("http://localhost/x", { method: "PUT", body: JSON.stringify({ widgets: [] }) });
    const response = await PUT(request, { params: { username: "testuser" } });
    expect(response.status).toBe(401);
  });

  it("saves widgets for the authenticated owner", async () => {
    const widgets = [{ id: "w1", type: "bio", col: 0, row: 0, width: 2, height: 1 }];
    const request = new NextRequest("http://localhost/x", {
      method: "PUT",
      headers: { cookie: `session=${token}` },
      body: JSON.stringify({ widgets }),
    });
    const response = await PUT(request, { params: { username: "testuser" } });
    expect(response.status).toBe(200);

    const check = await GET(new NextRequest("http://localhost/x"), { params: { username: "testuser" } });
    expect(await check.json()).toEqual({ widgets });
  });
});
```

- [ ] **Step 6: Run test to verify it fails**

Run: `npm test -- tests/app/api/profile/layout.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 7: Write the API route implementation**

`src/app/api/profile/[username]/layout/route.ts`:
```ts
import { NextRequest, NextResponse } from "next/server";
import { getLayout, saveLayout, Widget } from "../../../../../lib/layout/repository";
import { getProfileByUsername } from "../../../../../lib/profiles/repository";
import { requireSession } from "../../../../../lib/auth/require-session";

export async function GET(_request: NextRequest, { params }: { params: { username: string } }) {
  const profile = await getProfileByUsername(params.username);
  if (!profile) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  const widgets = await getLayout(profile.userId);
  return NextResponse.json({ widgets });
}

export async function PUT(request: NextRequest, { params }: { params: { username: string } }) {
  const session = requireSession(request.cookies.get("session")?.value);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const profile = await getProfileByUsername(params.username);
  if (!profile || profile.userId !== session.userId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  if (!Array.isArray(body?.widgets)) {
    return NextResponse.json({ error: "widgets must be an array" }, { status: 400 });
  }

  await saveLayout(session.userId, body.widgets as Widget[]);
  return NextResponse.json({ ok: true });
}
```

- [ ] **Step 8: Run test to verify it passes**

Run: `npm test -- tests/app/api/profile/layout.test.ts`
Expected: PASS (3 tests).

- [ ] **Step 9: Commit**

```bash
git add src/lib/layout src/app/api/profile/[username]/layout tests/lib/layout tests/app/api/profile/layout.test.ts
git commit -m "feat: add profile layout repository and API route"
```

---

### Task 12: Posts repository and API routes

**Files:**
- Create: `src/lib/posts/repository.ts`
- Create: `src/app/api/posts/route.ts`
- Create: `src/app/api/posts/[id]/route.ts`
- Test: `tests/lib/posts/repository.test.ts`
- Test: `tests/app/api/posts/route.test.ts`

**Interfaces:**
- Consumes: `db`, `posts`, `users` (Task 2); `sanitizePostHtml` (Task 8);
  `requireSession` (Task 6).
- Produces: `createPost(input: { authorId: number; title: string; body: string })`,
  `listPostsByAuthor(authorId: number)`, `getPostById(id: number)` — used by the
  media route (Task 13, to validate `postId`) and comments route (Task 14) via
  `getPostById`; consumed by the frontend via `POST/GET /api/posts`,
  `GET /api/posts/[id]`.

- [ ] **Step 1: Write the failing repository test**

`tests/lib/posts/repository.test.ts`:
```ts
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { db } from "../../../src/db/client";
import { users, posts } from "../../../src/db/schema";
import { createPost, listPostsByAuthor, getPostById } from "../../../src/lib/posts/repository";

let authorId: number;

beforeEach(async () => {
  const [user] = await db
    .insert(users)
    .values({ username: "testuser", passwordHash: "x", displayName: "Test User" })
    .returning();
  authorId = user.id;
});

afterEach(async () => {
  await db.delete(posts);
  await db.delete(users);
});

describe("posts repository", () => {
  it("creates and fetches a post by id", async () => {
    const created = await createPost({ authorId, title: "Hello", body: "<p>World</p>" });
    const fetched = await getPostById(created.id);
    expect(fetched?.title).toBe("Hello");
  });

  it("lists posts by author, newest first", async () => {
    await createPost({ authorId, title: "First", body: "<p>1</p>" });
    await createPost({ authorId, title: "Second", body: "<p>2</p>" });
    const list = await listPostsByAuthor(authorId);
    expect(list.map((p) => p.title)).toEqual(["Second", "First"]);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- tests/lib/posts/repository.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Write the repository implementation**

`src/lib/posts/repository.ts`:
```ts
import { desc, eq } from "drizzle-orm";
import { db } from "../../db/client";
import { posts } from "../../db/schema";

export interface CreatePostInput {
  authorId: number;
  title: string;
  body: string;
}

export async function createPost(input: CreatePostInput) {
  const [row] = await db.insert(posts).values(input).returning();
  return row;
}

export async function listPostsByAuthor(authorId: number) {
  return db.select().from(posts).where(eq(posts.authorId, authorId)).orderBy(desc(posts.createdAt));
}

export async function getPostById(id: number) {
  const [row] = await db.select().from(posts).where(eq(posts.id, id)).limit(1);
  return row ?? null;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- tests/lib/posts/repository.test.ts`
Expected: PASS (2 tests).

- [ ] **Step 5: Write the failing API route test**

`tests/app/api/posts/route.test.ts`:
```ts
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { NextRequest } from "next/server";
import { db } from "../../../../src/db/client";
import { users, posts } from "../../../../src/db/schema";
import { createSessionToken } from "../../../../src/lib/auth/session";
import { POST, GET } from "../../../../src/app/api/posts/route";

let authorId: number;
let token: string;

beforeEach(async () => {
  process.env.SESSION_SECRET = "test-secret";
  const [user] = await db
    .insert(users)
    .values({ username: "testuser", passwordHash: "x", displayName: "Test User" })
    .returning();
  authorId = user.id;
  token = createSessionToken({ userId: authorId, username: "testuser" });
});

afterEach(async () => {
  await db.delete(posts);
  await db.delete(users);
});

describe("POST /api/posts", () => {
  it("rejects unauthenticated requests", async () => {
    const request = new NextRequest("http://localhost/api/posts", {
      method: "POST",
      body: JSON.stringify({ title: "Hi", body: "<p>hi</p>" }),
    });
    expect((await POST(request)).status).toBe(401);
  });

  it("creates a post and sanitizes the body", async () => {
    const request = new NextRequest("http://localhost/api/posts", {
      method: "POST",
      headers: { cookie: `session=${token}` },
      body: JSON.stringify({ title: "Hi", body: "<p>hi</p><script>bad()</script>" }),
    });
    const response = await POST(request);
    expect(response.status).toBe(201);
    const created = await response.json();
    expect(created.body).toBe("<p>hi</p>");
  });
});

describe("GET /api/posts", () => {
  it("lists posts for the given authorId query param", async () => {
    const create = new NextRequest("http://localhost/api/posts", {
      method: "POST",
      headers: { cookie: `session=${token}` },
      body: JSON.stringify({ title: "Hi", body: "<p>hi</p>" }),
    });
    await POST(create);

    const response = await GET(new NextRequest(`http://localhost/api/posts?authorId=${authorId}`));
    const list = await response.json();
    expect(list).toHaveLength(1);
    expect(list[0].title).toBe("Hi");
  });
});
```

- [ ] **Step 6: Run test to verify it fails**

Run: `npm test -- tests/app/api/posts/route.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 7: Write the API route implementation**

`src/app/api/posts/route.ts`:
```ts
import { NextRequest, NextResponse } from "next/server";
import { createPost, listPostsByAuthor } from "../../../lib/posts/repository";
import { requireSession } from "../../../lib/auth/require-session";
import { sanitizePostHtml } from "../../../lib/sanitize/html";

export async function POST(request: NextRequest) {
  const session = requireSession(request.cookies.get("session")?.value);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  if (!body?.title || typeof body.body !== "string") {
    return NextResponse.json({ error: "title and body are required" }, { status: 400 });
  }

  const post = await createPost({
    authorId: session.userId,
    title: body.title,
    body: sanitizePostHtml(body.body),
  });
  return NextResponse.json(post, { status: 201 });
}

export async function GET(request: NextRequest) {
  const authorId = Number(request.nextUrl.searchParams.get("authorId"));
  if (!authorId) {
    return NextResponse.json({ error: "authorId query param is required" }, { status: 400 });
  }
  const list = await listPostsByAuthor(authorId);
  return NextResponse.json(list);
}
```

`src/app/api/posts/[id]/route.ts`:
```ts
import { NextRequest, NextResponse } from "next/server";
import { getPostById } from "../../../../lib/posts/repository";

export async function GET(_request: NextRequest, { params }: { params: { id: string } }) {
  const post = await getPostById(Number(params.id));
  if (!post) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  return NextResponse.json(post);
}
```

- [ ] **Step 8: Run test to verify it passes**

Run: `npm test -- tests/app/api/posts/route.test.ts`
Expected: PASS (3 tests).

- [ ] **Step 9: Commit**

```bash
git add src/lib/posts/repository.ts src/app/api/posts/route.ts src/app/api/posts/[id]/route.ts tests/lib/posts/repository.test.ts tests/app/api/posts/route.test.ts
git commit -m "feat: add posts repository and API routes"
```

---

### Task 13: Post media repository and API route

**Files:**
- Create: `src/lib/posts/media-repository.ts`
- Create: `src/app/api/posts/[id]/media/route.ts`
- Test: `tests/lib/posts/media-repository.test.ts`
- Test: `tests/app/api/posts/media.test.ts`

**Interfaces:**
- Consumes: `db`, `postMedia` (Task 2); `getPostById` (Task 12); `requireSession`
  (Task 6).
- Produces: `MediaType = "image" | "video_upload" | "video_youtube" | "song"`,
  `attachMedia(input: { postId: number; type: MediaType; url: string; position:
  number })`, `listMediaForPost(postId: number)` — used by the frontend via
  `POST/GET /api/posts/[id]/media`.

- [ ] **Step 1: Write the failing repository test**

`tests/lib/posts/media-repository.test.ts`:
```ts
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { db } from "../../../src/db/client";
import { users, posts, postMedia } from "../../../src/db/schema";
import { attachMedia, listMediaForPost } from "../../../src/lib/posts/media-repository";

let postId: number;

beforeEach(async () => {
  const [user] = await db
    .insert(users)
    .values({ username: "testuser", passwordHash: "x", displayName: "Test User" })
    .returning();
  const [post] = await db.insert(posts).values({ authorId: user.id, title: "Hi", body: "<p>hi</p>" }).returning();
  postId = post.id;
});

afterEach(async () => {
  await db.delete(postMedia);
  await db.delete(posts);
  await db.delete(users);
});

describe("post media repository", () => {
  it("attaches and lists media in position order", async () => {
    await attachMedia({ postId, type: "song", url: "spotify:track:abc", position: 1 });
    await attachMedia({ postId, type: "image", url: "https://example.com/a.jpg", position: 0 });
    const list = await listMediaForPost(postId);
    expect(list.map((m) => m.type)).toEqual(["image", "song"]);
  });

  it("rejects an invalid media type", async () => {
    await expect(
      attachMedia({ postId, type: "gif" as never, url: "x", position: 0 })
    ).rejects.toThrow("Invalid media type: gif");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- tests/lib/posts/media-repository.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Write the repository implementation**

`src/lib/posts/media-repository.ts`:
```ts
import { asc, eq } from "drizzle-orm";
import { db } from "../../db/client";
import { postMedia } from "../../db/schema";

export type MediaType = "image" | "video_upload" | "video_youtube" | "song";
const VALID_TYPES = new Set<MediaType>(["image", "video_upload", "video_youtube", "song"]);

export interface AttachMediaInput {
  postId: number;
  type: MediaType;
  url: string;
  position: number;
}

export async function attachMedia(input: AttachMediaInput) {
  if (!VALID_TYPES.has(input.type)) {
    throw new Error(`Invalid media type: ${input.type}`);
  }
  const [row] = await db.insert(postMedia).values(input).returning();
  return row;
}

export async function listMediaForPost(postId: number) {
  return db.select().from(postMedia).where(eq(postMedia.postId, postId)).orderBy(asc(postMedia.position));
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- tests/lib/posts/media-repository.test.ts`
Expected: PASS (2 tests).

- [ ] **Step 5: Write the failing API route test**

`tests/app/api/posts/media.test.ts`:
```ts
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { NextRequest } from "next/server";
import { db } from "../../../../src/db/client";
import { users, posts, postMedia } from "../../../../src/db/schema";
import { createSessionToken } from "../../../../src/lib/auth/session";
import { POST, GET } from "../../../../src/app/api/posts/[id]/media/route";

let authorId: number;
let postId: number;
let token: string;

beforeEach(async () => {
  process.env.SESSION_SECRET = "test-secret";
  const [user] = await db
    .insert(users)
    .values({ username: "testuser", passwordHash: "x", displayName: "Test User" })
    .returning();
  authorId = user.id;
  const [post] = await db.insert(posts).values({ authorId, title: "Hi", body: "<p>hi</p>" }).returning();
  postId = post.id;
  token = createSessionToken({ userId: authorId, username: "testuser" });
});

afterEach(async () => {
  await db.delete(postMedia);
  await db.delete(posts);
  await db.delete(users);
});

describe("POST /api/posts/[id]/media", () => {
  it("rejects unauthenticated requests", async () => {
    const request = new NextRequest("http://localhost/x", {
      method: "POST",
      body: JSON.stringify({ type: "image", url: "https://example.com/a.jpg", position: 0 }),
    });
    const response = await POST(request, { params: { id: String(postId) } });
    expect(response.status).toBe(401);
  });

  it("attaches media and lists it back", async () => {
    const request = new NextRequest("http://localhost/x", {
      method: "POST",
      headers: { cookie: `session=${token}` },
      body: JSON.stringify({ type: "image", url: "https://example.com/a.jpg", position: 0 }),
    });
    expect((await POST(request, { params: { id: String(postId) } })).status).toBe(201);

    const response = await GET(new NextRequest("http://localhost/x"), { params: { id: String(postId) } });
    const list = await response.json();
    expect(list).toHaveLength(1);
    expect(list[0].type).toBe("image");
  });
});
```

- [ ] **Step 6: Run test to verify it fails**

Run: `npm test -- tests/app/api/posts/media.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 7: Write the API route implementation**

`src/app/api/posts/[id]/media/route.ts`:
```ts
import { NextRequest, NextResponse } from "next/server";
import { attachMedia, listMediaForPost, MediaType } from "../../../../../lib/posts/media-repository";
import { getPostById } from "../../../../../lib/posts/repository";
import { requireSession } from "../../../../../lib/auth/require-session";

const VALID_TYPES = new Set(["image", "video_upload", "video_youtube", "song"]);

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  const session = requireSession(request.cookies.get("session")?.value);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const postId = Number(params.id);
  const post = await getPostById(postId);
  if (!post || post.authorId !== session.userId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  if (!body?.type || !VALID_TYPES.has(body.type) || typeof body.url !== "string") {
    return NextResponse.json({ error: "type and url are required" }, { status: 400 });
  }

  const media = await attachMedia({
    postId,
    type: body.type as MediaType,
    url: body.url,
    position: Number(body.position) || 0,
  });
  return NextResponse.json(media, { status: 201 });
}

export async function GET(_request: NextRequest, { params }: { params: { id: string } }) {
  const list = await listMediaForPost(Number(params.id));
  return NextResponse.json(list);
}
```

- [ ] **Step 8: Run test to verify it passes**

Run: `npm test -- tests/app/api/posts/media.test.ts`
Expected: PASS (2 tests).

- [ ] **Step 9: Commit**

```bash
git add src/lib/posts/media-repository.ts src/app/api/posts/[id]/media tests/lib/posts/media-repository.test.ts tests/app/api/posts/media.test.ts
git commit -m "feat: add post media repository and API route"
```

---

### Task 14: Comments repository and API route

**Files:**
- Create: `src/lib/comments/repository.ts`
- Create: `src/app/api/posts/[id]/comments/route.ts`
- Test: `tests/lib/comments/repository.test.ts`
- Test: `tests/app/api/posts/comments.test.ts`

**Interfaces:**
- Consumes: `db`, `comments` (Task 2); `sanitizePostHtml` (Task 8); `getPostById`
  (Task 12); `requireSession` (Task 6).
- Produces: `addComment(input: { postId: number; authorId: number; body: string
  })`, `listCommentsForPost(postId: number)` — used by the frontend via
  `POST/GET /api/posts/[id]/comments`.

- [ ] **Step 1: Write the failing repository test**

`tests/lib/comments/repository.test.ts`:
```ts
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { db } from "../../../src/db/client";
import { users, posts, comments } from "../../../src/db/schema";
import { addComment, listCommentsForPost } from "../../../src/lib/comments/repository";

let authorId: number;
let postId: number;

beforeEach(async () => {
  const [user] = await db
    .insert(users)
    .values({ username: "testuser", passwordHash: "x", displayName: "Test User" })
    .returning();
  authorId = user.id;
  const [post] = await db.insert(posts).values({ authorId, title: "Hi", body: "<p>hi</p>" }).returning();
  postId = post.id;
});

afterEach(async () => {
  await db.delete(comments);
  await db.delete(posts);
  await db.delete(users);
});

describe("comments repository", () => {
  it("sanitizes and stores a comment", async () => {
    await addComment({ postId, authorId, body: "<p>nice</p><script>bad()</script>" });
    const list = await listCommentsForPost(postId);
    expect(list[0].body).toBe("<p>nice</p>");
  });

  it("lists comments oldest first", async () => {
    await addComment({ postId, authorId, body: "<p>first</p>" });
    await addComment({ postId, authorId, body: "<p>second</p>" });
    const list = await listCommentsForPost(postId);
    expect(list.map((c) => c.body)).toEqual(["<p>first</p>", "<p>second</p>"]);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- tests/lib/comments/repository.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Write the repository implementation**

`src/lib/comments/repository.ts`:
```ts
import { asc, eq } from "drizzle-orm";
import { db } from "../../db/client";
import { comments } from "../../db/schema";
import { sanitizePostHtml } from "../sanitize/html";

export interface CreateCommentInput {
  postId: number;
  authorId: number;
  body: string;
}

export async function addComment(input: CreateCommentInput) {
  const [row] = await db
    .insert(comments)
    .values({ ...input, body: sanitizePostHtml(input.body) })
    .returning();
  return row;
}

export async function listCommentsForPost(postId: number) {
  return db.select().from(comments).where(eq(comments.postId, postId)).orderBy(asc(comments.createdAt));
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- tests/lib/comments/repository.test.ts`
Expected: PASS (2 tests).

- [ ] **Step 5: Write the failing API route test**

`tests/app/api/posts/comments.test.ts`:
```ts
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { NextRequest } from "next/server";
import { db } from "../../../../src/db/client";
import { users, posts, comments } from "../../../../src/db/schema";
import { createSessionToken } from "../../../../src/lib/auth/session";
import { POST, GET } from "../../../../src/app/api/posts/[id]/comments/route";

let authorId: number;
let postId: number;
let token: string;

beforeEach(async () => {
  process.env.SESSION_SECRET = "test-secret";
  const [user] = await db
    .insert(users)
    .values({ username: "testuser", passwordHash: "x", displayName: "Test User" })
    .returning();
  authorId = user.id;
  const [post] = await db.insert(posts).values({ authorId, title: "Hi", body: "<p>hi</p>" }).returning();
  postId = post.id;
  token = createSessionToken({ userId: authorId, username: "testuser" });
});

afterEach(async () => {
  await db.delete(comments);
  await db.delete(posts);
  await db.delete(users);
});

describe("POST /api/posts/[id]/comments", () => {
  it("rejects unauthenticated requests", async () => {
    const request = new NextRequest("http://localhost/x", {
      method: "POST",
      body: JSON.stringify({ body: "<p>nice</p>" }),
    });
    const response = await POST(request, { params: { id: String(postId) } });
    expect(response.status).toBe(401);
  });

  it("adds a comment and lists it back", async () => {
    const request = new NextRequest("http://localhost/x", {
      method: "POST",
      headers: { cookie: `session=${token}` },
      body: JSON.stringify({ body: "<p>nice</p>" }),
    });
    expect((await POST(request, { params: { id: String(postId) } })).status).toBe(201);

    const response = await GET(new NextRequest("http://localhost/x"), { params: { id: String(postId) } });
    const list = await response.json();
    expect(list).toHaveLength(1);
    expect(list[0].body).toBe("<p>nice</p>");
  });
});
```

- [ ] **Step 6: Run test to verify it fails**

Run: `npm test -- tests/app/api/posts/comments.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 7: Write the API route implementation**

`src/app/api/posts/[id]/comments/route.ts`:
```ts
import { NextRequest, NextResponse } from "next/server";
import { addComment, listCommentsForPost } from "../../../../../lib/comments/repository";
import { getPostById } from "../../../../../lib/posts/repository";
import { requireSession } from "../../../../../lib/auth/require-session";

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  const session = requireSession(request.cookies.get("session")?.value);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const postId = Number(params.id);
  const post = await getPostById(postId);
  if (!post) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const body = await request.json().catch(() => null);
  if (typeof body?.body !== "string" || !body.body.trim()) {
    return NextResponse.json({ error: "body is required" }, { status: 400 });
  }

  const comment = await addComment({ postId, authorId: session.userId, body: body.body });
  return NextResponse.json(comment, { status: 201 });
}

export async function GET(_request: NextRequest, { params }: { params: { id: string } }) {
  const list = await listCommentsForPost(Number(params.id));
  return NextResponse.json(list);
}
```

- [ ] **Step 8: Run test to verify it passes**

Run: `npm test -- tests/app/api/posts/comments.test.ts`
Expected: PASS (2 tests).

- [ ] **Step 9: Commit**

```bash
git add src/lib/comments src/app/api/posts/[id]/comments tests/lib/comments/repository.test.ts tests/app/api/posts/comments.test.ts
git commit -m "feat: add comments repository and API route"
```

---

### Task 15: Spotify search client

**Files:**
- Create: `src/lib/spotify/client.ts`
- Test: `tests/lib/spotify/client.test.ts`

**Interfaces:**
- Consumes: `process.env.SPOTIFY_CLIENT_ID`, `process.env.SPOTIFY_CLIENT_SECRET`.
- Produces: `SpotifyTrack { id: string; name: string; artist: string; url: string
  }`, `searchTracks(query: string, fetchImpl?: typeof fetch):
  Promise<SpotifyTrack[]>`, `resetSpotifyTokenCacheForTests(): void` — used by the
  Spotify search API route (Task 16).

- [ ] **Step 1: Write the failing test**

`tests/lib/spotify/client.test.ts`:
```ts
import { describe, it, expect, vi, beforeEach } from "vitest";
import { searchTracks, resetSpotifyTokenCacheForTests } from "../../../src/lib/spotify/client";

beforeEach(() => {
  resetSpotifyTokenCacheForTests();
  process.env.SPOTIFY_CLIENT_ID = "id";
  process.env.SPOTIFY_CLIENT_SECRET = "secret";
});

function mockFetch() {
  return vi.fn(async (url: string) => {
    if (url.includes("accounts.spotify.com")) {
      return new Response(JSON.stringify({ access_token: "tok", expires_in: 3600 }), { status: 200 });
    }
    return new Response(
      JSON.stringify({
        tracks: {
          items: [
            {
              id: "abc",
              name: "Song",
              artists: [{ name: "Artist" }],
              external_urls: { spotify: "https://open.spotify.com/track/abc" },
            },
          ],
        },
      }),
      { status: 200 }
    );
  });
}

describe("searchTracks", () => {
  it("exchanges credentials for a token and returns mapped tracks", async () => {
    const fetchImpl = mockFetch();
    const results = await searchTracks("song", fetchImpl as unknown as typeof fetch);
    expect(results).toEqual([{ id: "abc", name: "Song", artist: "Artist", url: "https://open.spotify.com/track/abc" }]);
    expect(fetchImpl).toHaveBeenCalledTimes(2);
  });

  it("reuses a cached token on a second search", async () => {
    const fetchImpl = mockFetch();
    await searchTracks("song", fetchImpl as unknown as typeof fetch);
    await searchTracks("another", fetchImpl as unknown as typeof fetch);
    const tokenCalls = fetchImpl.mock.calls.filter(([url]) => String(url).includes("accounts.spotify.com"));
    expect(tokenCalls).toHaveLength(1);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- tests/lib/spotify/client.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Write the implementation**

`src/lib/spotify/client.ts`:
```ts
let cachedToken: { value: string; expiresAt: number } | null = null;

async function getAccessToken(fetchImpl: typeof fetch): Promise<string> {
  if (cachedToken && cachedToken.expiresAt > Date.now()) {
    return cachedToken.value;
  }

  const clientId = process.env.SPOTIFY_CLIENT_ID;
  const clientSecret = process.env.SPOTIFY_CLIENT_SECRET;
  if (!clientId || !clientSecret) throw new Error("Spotify credentials are not set");

  const response = await fetchImpl("https://accounts.spotify.com/api/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization: `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString("base64")}`,
    },
    body: "grant_type=client_credentials",
  });
  if (!response.ok) throw new Error("Failed to fetch Spotify access token");

  const data = await response.json();
  cachedToken = { value: data.access_token, expiresAt: Date.now() + (data.expires_in - 60) * 1000 };
  return cachedToken.value;
}

export interface SpotifyTrack {
  id: string;
  name: string;
  artist: string;
  url: string;
}

export async function searchTracks(query: string, fetchImpl: typeof fetch = fetch): Promise<SpotifyTrack[]> {
  const token = await getAccessToken(fetchImpl);
  const response = await fetchImpl(
    `https://api.spotify.com/v1/search?type=track&limit=10&q=${encodeURIComponent(query)}`,
    { headers: { Authorization: `Bearer ${token}` } }
  );
  if (!response.ok) throw new Error("Spotify search failed");

  const data = await response.json();
  return data.tracks.items.map((track: { id: string; name: string; artists: { name: string }[]; external_urls: { spotify: string } }) => ({
    id: track.id,
    name: track.name,
    artist: track.artists.map((a) => a.name).join(", "),
    url: track.external_urls.spotify,
  }));
}

export function resetSpotifyTokenCacheForTests(): void {
  cachedToken = null;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- tests/lib/spotify/client.test.ts`
Expected: PASS (2 tests).

- [ ] **Step 5: Commit**

```bash
git add src/lib/spotify tests/lib/spotify/client.test.ts
git commit -m "feat: add Spotify token exchange and track search"
```

---

### Task 16: Spotify search API route

**Files:**
- Create: `src/app/api/spotify/search/route.ts`
- Test: `tests/app/api/spotify/search.test.ts`

**Interfaces:**
- Consumes: `searchTracks` (Task 15), `requireSession` (Task 6).
- Produces: `GET /api/spotify/search?q=<query>` — used by the frontend's music
  attach UI (follow-up plan).

- [ ] **Step 1: Write the failing test**

`tests/app/api/spotify/search.test.ts`:
```ts
import { describe, it, expect, vi, beforeAll } from "vitest";
import { NextRequest } from "next/server";
import { createSessionToken } from "../../../../src/lib/auth/session";
import * as spotifyClient from "../../../../src/lib/spotify/client";
import { GET } from "../../../../src/app/api/spotify/search/route";

let token: string;

beforeAll(() => {
  process.env.SESSION_SECRET = "test-secret";
  token = createSessionToken({ userId: 1, username: "testuser" });
});

describe("GET /api/spotify/search", () => {
  it("rejects unauthenticated requests", async () => {
    const response = await GET(new NextRequest("http://localhost/api/spotify/search?q=song"));
    expect(response.status).toBe(401);
  });

  it("returns search results for an authenticated request", async () => {
    vi.spyOn(spotifyClient, "searchTracks").mockResolvedValueOnce([
      { id: "abc", name: "Song", artist: "Artist", url: "https://open.spotify.com/track/abc" },
    ]);
    const request = new NextRequest("http://localhost/api/spotify/search?q=song", {
      headers: { cookie: `session=${token}` },
    });
    const response = await GET(request);
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body).toEqual([{ id: "abc", name: "Song", artist: "Artist", url: "https://open.spotify.com/track/abc" }]);
  });

  it("returns 400 when q is missing", async () => {
    const request = new NextRequest("http://localhost/api/spotify/search", {
      headers: { cookie: `session=${token}` },
    });
    expect((await GET(request)).status).toBe(400);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- tests/app/api/spotify/search.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Write the implementation**

`src/app/api/spotify/search/route.ts`:
```ts
import { NextRequest, NextResponse } from "next/server";
import { searchTracks } from "../../../../lib/spotify/client";
import { requireSession } from "../../../../lib/auth/require-session";

export async function GET(request: NextRequest) {
  const session = requireSession(request.cookies.get("session")?.value);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const query = request.nextUrl.searchParams.get("q");
  if (!query) {
    return NextResponse.json({ error: "q query param is required" }, { status: 400 });
  }

  const results = await searchTracks(query);
  return NextResponse.json(results);
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- tests/app/api/spotify/search.test.ts`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add src/app/api/spotify tests/app/api/spotify/search.test.ts
git commit -m "feat: add Spotify search API route"
```

---

### Task 17: Seed script for the two user accounts

**Files:**
- Create: `scripts/seed.ts`

**Interfaces:**
- Consumes: `db`, `users`, `profiles` (Task 2); `hashPassword` (Task 3).
- Produces: a runnable `npm run seed` that creates exactly two accounts from env
  vars, idempotently (skips a username that already exists).

- [ ] **Step 1: Write the script**

`scripts/seed.ts`:
```ts
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

  const [user] = await db
    .insert(users)
    .values({
      username: account.username,
      passwordHash: await hashPassword(account.password),
      displayName: account.displayName,
    })
    .returning();
  await db.insert(profiles).values({ userId: user.id });
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
```

- [ ] **Step 2: Add seed vars to `.env.example`**

Append to `.env.example`:
```
SEED_USER1_USERNAME=
SEED_USER1_PASSWORD=
SEED_USER1_DISPLAY_NAME=
SEED_USER2_USERNAME=
SEED_USER2_PASSWORD=
SEED_USER2_DISPLAY_NAME=
```

- [ ] **Step 3: Run it against the dev database and verify**

Set the six `SEED_USER*` vars in `.env`, then:

Run: `npx drizzle-kit push` (against `.env`'s `DATABASE_URL`, if not already applied)
Run: `npm run seed`
Expected: `Created account: <username>` printed twice.

Run: `npm run seed` again
Expected: `Skipping <username>: already exists` printed twice — confirms idempotency.

- [ ] **Step 4: Commit**

```bash
git add scripts/seed.ts .env.example
git commit -m "feat: add seed script for the two user accounts"
```

---

## Self-Review Notes

- **Spec coverage:** Auth (Tasks 3-7), profile + custom CSS (Tasks 9-10), profile
  layout for the drag-and-drop canvas (Task 11), blog posts with rich text (Task
  12), post media incl. images/video/song per spec's `post_media.type` (Task 13),
  comments (Task 14), Spotify search-and-attach (Tasks 15-16), two-account setup
  (Task 17) — all covered. Theme gallery/drag-and-drop/rich-text editor UI,
  profile-song widget rendering, and file upload storage wiring are explicitly
  deferred to the follow-up frontend plan (see "Out of scope" above).
- **Type consistency:** `Widget` (Task 11), `MediaType` (Task 13), and
  `SessionPayload` (Task 4) are defined once and imported by name everywhere else
  they're used — no redefinitions or renamed duplicates across tasks.
- **Ordering:** Tasks 10-16 each depend only on earlier tasks (schema/auth/sanitize
  first, then per-resource repository before its route), so they can be executed
  strictly in order.
