import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    include: ["tests/**/*.test.ts"],
    setupFiles: ["./tests/setup.ts"],
    // Tests share one real Postgres database; running files in parallel
    // lets concurrent beforeEach/afterEach hooks race on the same rows
    // (e.g. duplicate "testuser" inserts across auth test files).
    fileParallelism: false,
  },
});
