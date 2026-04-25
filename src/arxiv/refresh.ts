import type { ArxivPaper } from "../domain/types";
import { parseArxivFeed } from "./parser";
import type {
  RefreshArxivCacheDependencies,
  RefreshArxivCacheInput,
  RefreshArxivCacheResult
} from "./types";

export async function refreshArxivCache(
  input: RefreshArxivCacheInput,
  dependencies: RefreshArxivCacheDependencies
): Promise<RefreshArxivCacheResult> {
  const categories = unique(input.categories);

  if (categories.length === 0) {
    throw new Error("At least one arXiv category is required");
  }

  const papersById = new Map<string, ArxivPaper>();
  let fetched = 0;
  let skipped = 0;

  const results = await Promise.all(
    categories.map(async (category) => {
      const feed = await dependencies.client.fetchFeed({
        category,
        fromDate: input.fromDate,
        toDate: input.toDate,
        maxResults: input.maxResults
      });
      return parseArxivFeed(feed);
    })
  );

  for (const parsed of results) {
    fetched += parsed.papers.length;
    skipped += parsed.skipped;

    for (const paper of parsed.papers) {
      if (papersById.has(paper.arxivId)) {
        skipped += 1;
      } else {
        papersById.set(paper.arxivId, paper);
      }
    }
  }

  const upserted = await dependencies.repositories.papers.upsertMany([...papersById.values()]);
  const result = {
    fetched,
    upserted: upserted.length,
    skipped
  };

  dependencies.logger?.info("arxiv_refresh_complete", result);

  return result;
}

export function unique(values: string[]): string[] {
  return [...new Set(values.map((value) => value.trim()).filter(Boolean))];
}
