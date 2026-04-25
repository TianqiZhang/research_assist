import { readFile } from "node:fs/promises";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import type { ArxivFeedClient } from "../../src/arxiv";
import { createInMemoryRepositories } from "../../src/db/memory";
import type { WorkerBindings } from "../../src/env";
import { createApp } from "../../src/http/router";

const env: WorkerBindings = {
  USE_MOCK_PROVIDERS: "true",
  LLM_PROVIDER: "mock",
  EMAIL_PROVIDER: "mock",
  INTERNAL_API_SECRET: "internal-secret",
  APP_BASE_URL: "http://localhost:8787"
};

async function readFeed(): Promise<string> {
  return readFile(join(process.cwd(), "test", "fixtures", "arxiv", "feed.xml"), "utf8");
}

describe("POST /internal/arxiv/refresh", () => {
  it("rejects requests without the internal secret", async () => {
    const app = createApp({
      repositories: createInMemoryRepositories()
    });

    const response = await app.request(
      "/internal/arxiv/refresh",
      {
        method: "POST",
        body: JSON.stringify({
          categories: ["cs.AI"],
          from_date: "2026-04-01",
          to_date: "2026-04-25"
        })
      },
      env
    );

    await expect(response.json()).resolves.toEqual({
      error: {
        code: "unauthorized",
        message: "Internal API secret is required"
      }
    });
    expect(response.status).toBe(401);
  });

  it("refreshes the cache with a mocked arXiv client", async () => {
    const feed = await readFeed();
    const repositories = createInMemoryRepositories();
    const client: ArxivFeedClient = {
      async fetchFeed() {
        return feed;
      }
    };
    const app = createApp({
      repositories,
      arxivClient: client
    });

    const response = await app.request(
      "/internal/arxiv/refresh",
      {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-internal-api-secret": "internal-secret"
        },
        body: JSON.stringify({
          categories: ["cs.AI"],
          from_date: "2026-04-01",
          to_date: "2026-04-25",
          max_results: 100
        })
      },
      env
    );

    await expect(response.json()).resolves.toEqual({
      fetched: 2,
      upserted: 2,
      skipped: 0
    });
    await expect(
      repositories.papers.searchRecent({
        categories: ["cs.AI"],
        fromDate: "2026-04-01",
        toDate: "2026-04-25"
      })
    ).resolves.toHaveLength(1);
  });
});
