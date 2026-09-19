/**
 * Server-side HTML sanitizer for rich-text invoice fields.
 *
 * This is a defense-in-depth layer: the client already re-sanitizes with
 * DOMPurify before rendering (see BlockRenderer.tsx). This module ensures the
 * data persisted in the database is already clean, so a stored value can never
 * carry active content regardless of how it is later consumed.
 *
 * The allow-list mirrors the client exactly:
 *   ALLOWED_TAGS: p, br, strong, b, em, i, u, s, code, pre, ol, ul, li, span
 *   ALLOWED_ATTR: (none)
 *
 * Because no attributes are allowed, there are no href/style/on* vectors to
 * reason about. The strategy is:
 *   1. Remove entire "dangerous container" elements together with their content
 *      (script, style, etc.), so their text payload is not left behind.
 *   2. Strip every remaining tag that is not on the allow-list (keeping inner
 *      text), and drop all attributes from allowed tags.
 */

const ALLOWED_TAGS = new Set([
  'p', 'br', 'strong', 'b', 'em', 'i', 'u', 's',
  'code', 'pre', 'ol', 'ul', 'li', 'span',
]);

// Elements whose *contents* must also be discarded, not just their tags.
const DANGEROUS_ELEMENTS = [
  'script', 'style', 'iframe', 'object', 'embed', 'noscript',
  'template', 'title', 'textarea', 'svg', 'math',
];

const DANGEROUS_ELEMENT_RE = new RegExp(
  `<(${DANGEROUS_ELEMENTS.join('|')})\\b[\\s\\S]*?<\\/\\1\\s*>`,
  'gi'
);

// Matches any HTML tag: capturing an optional leading slash and the tag name.
const TAG_RE = /<\/?\s*([a-zA-Z][a-zA-Z0-9]*)\b[^>]*>/g;

// HTML comments (including conditional comments) and CDATA sections.
const COMMENT_RE = /<!--[\s\S]*?-->/g;
const CDATA_RE = /<!\[CDATA\[[\s\S]*?\]\]>/gi;

/**
 * Sanitize a rich-text HTML string using the shared allow-list.
 * Non-string input returns an empty string.
 */
export const sanitizeRichText = (input: unknown): string => {
  if (typeof input !== 'string' || input.length === 0) return '';

  let html = input;

  // 1. Drop comments/CDATA and dangerous elements (with their content).
  html = html.replace(COMMENT_RE, '');
  html = html.replace(CDATA_RE, '');

  // Run the dangerous-element pass repeatedly to handle nesting/overlap.
  let previous: string;
  do {
    previous = html;
    html = html.replace(DANGEROUS_ELEMENT_RE, '');
  } while (html !== previous);

  // Remove any leftover opening tags of dangerous elements that were not
  // properly closed (e.g. "<script>" with no "</script>").
  const leftoverDangerousRe = new RegExp(
    `<\\/?\\s*(${DANGEROUS_ELEMENTS.join('|')})\\b[^>]*>`,
    'gi'
  );
  html = html.replace(leftoverDangerousRe, '');

  // 2. Strip every tag not on the allow-list; strip all attributes from the
  //    allowed tags (rebuild them bare).
  html = html.replace(TAG_RE, (match, rawName: string) => {
    const isClosing = /^<\s*\//.test(match);
    const name = rawName.toLowerCase();

    if (!ALLOWED_TAGS.has(name)) return '';

    if (isClosing) return `</${name}>`;

    // Preserve self-closing form for void-like tags (only <br> here).
    const selfClosing = /\/\s*>$/.test(match);
    return selfClosing || name === 'br' ? `<${name}>` : `<${name}>`;
  });

  return html;
};
