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
