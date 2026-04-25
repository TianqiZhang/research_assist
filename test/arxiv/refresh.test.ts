import { readFile } from "node:fs/promises";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import { refreshArxivCache, type ArxivFeedClient } from "../../src/arxiv";
import { createInMemoryRepositories } from "../../src/db/memory";

async function readFeed(): Promise<string> {
  return readFile(join(process.cwd(), "test", "fixtures", "arxiv", "feed.xml"), "utf8");
}

describe("refreshArxivCache", () => {
  it("deduplicates papers across categories before upserting", async () => {
    const feed = await readFeed();
    const repositories = createInMemoryRepositories();
    const client: ArxivFeedClient = {
      async fetchFeed() {
        return feed;
      }
    };

    const result = await refreshArxivCache(
      {
        categories: ["cs.AI", "cs.CL"],
        fromDate: "2026-04-01",
        toDate: "2026-04-25",
        maxResults: 100
      },
      {
        client,
        repositories
      }
    );

    const cached = await repositories.papers.searchRecent({
      categories: ["cs.AI", "cs.CL"],
      fromDate: "2026-04-01",
      toDate: "2026-04-25"
    });

    expect(result).toEqual({
      fetched: 4,
      upserted: 2,
      skipped: 2
    });
    expect(cached.map((paper) => paper.arxivId)).toEqual(["2604.00001", "2604.00002"]);
  });

  it("can upsert the same response twice without duplicating papers", async () => {
    const feed = await readFeed();
    const repositories = createInMemoryRepositories();
    const client: ArxivFeedClient = {
      async fetchFeed() {
        return feed;
      }
    };
    const input = {
      categories: ["cs.AI"],
      fromDate: "2026-04-01",
      toDate: "2026-04-25",
      maxResults: 100
    };

    await refreshArxivCache(input, { client, repositories });
    await refreshArxivCache(input, { client, repositories });

    const cached = await repositories.papers.searchRecent({
      categories: [],
      fromDate: "2026-04-01",
      toDate: "2026-04-25"
    });

    expect(cached).toHaveLength(2);
  });
});
