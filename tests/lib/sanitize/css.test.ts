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
