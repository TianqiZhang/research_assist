import { readFile } from "node:fs/promises";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import { extractArxivId, normalizeWhitespace, parseArxivFeed } from "../../src/arxiv";

async function readFixture(name: string): Promise<string> {
  return readFile(join(process.cwd(), "test", "fixtures", "arxiv", name), "utf8");
}

describe("parseArxivFeed", () => {
  it("parses arXiv Atom entries into normalized paper metadata", async () => {
    const xml = await readFixture("feed.xml");

    const result = parseArxivFeed(xml);

    expect(result.skipped).toBe(0);
    expect(result.papers).toHaveLength(2);
    expect(result.papers[0]).toMatchObject({
      arxivId: "2604.00001",
      title: "Practical Tool Use for Research Agents",
      abstract: "A benchmark-driven study of tool-using AI agents for research workflows.",
      authors: ["Ada Lovelace", "Grace Hopper"],
      categories: ["cs.AI", "cs.CL"],
      primaryCategory: "cs.AI",
      publishedAt: "2026-04-20T10:00:00.000Z",
      updatedAt: "2026-04-21T10:00:00.000Z",
      absUrl: "http://arxiv.org/abs/2604.00001v1",
      pdfUrl: "http://arxiv.org/pdf/2604.00001v1"
    });
  });

  it("skips malformed entries without failing the whole feed", () => {
    const xml = `<?xml version="1.0"?><feed><entry><title>Missing ID</title></entry></feed>`;

    expect(parseArxivFeed(xml)).toEqual({
      papers: [],
      skipped: 1
    });
  });

  it("normalizes whitespace and strips arXiv version suffixes", () => {
    expect(normalizeWhitespace("  A\n\n  title\twith   space ")).toBe(
      "A title with space"
    );
    expect(extractArxivId("https://arxiv.org/abs/2604.00001v3")).toBe("2604.00001");
  });
});
