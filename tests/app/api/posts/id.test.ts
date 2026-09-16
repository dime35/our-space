import { describe, it, expect } from "vitest";
import { NextRequest } from "next/server";
import { GET } from "../../../../src/app/api/posts/[id]/route";

describe("GET /api/posts/[id]", () => {
  it("returns 404 for a non-numeric id", async () => {
    const response = await GET(new NextRequest("http://localhost/api/posts/not-a-number"), {
      params: { id: "not-a-number" },
    });
    expect(response.status).toBe(404);
  });
});
