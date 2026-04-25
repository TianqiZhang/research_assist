import sanitizeHtml from "sanitize-html";

export function sanitizeDigestHtml(html: string): string {
  return sanitizeHtml(html, {
    allowedTags: [
      "a",
      "blockquote",
      "br",
      "code",
      "em",
      "h1",
      "h2",
      "h3",
      "li",
      "ol",
      "p",
      "pre",
      "strong",
      "ul"
    ],
    allowedAttributes: {
      a: ["href", "title", "target", "rel"]
    },
    transformTags: {
      a: sanitizeHtml.simpleTransform("a", {
        rel: "noreferrer",
        target: "_blank"
      })
    }
  });
}
