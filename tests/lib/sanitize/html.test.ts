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
