import type { Repositories } from "../db/repositories";

export interface FetchArxivFeedInput {
  category: string;
  fromDate: string;
  toDate: string;
  maxResults?: number;
}

export interface ArxivFeedClient {
  fetchFeed(input: FetchArxivFeedInput): Promise<string>;
}

export interface RefreshArxivCacheInput {
  categories: string[];
  fromDate: string;
  toDate: string;
  maxResults?: number;
}

export interface RefreshArxivCacheResult {
  fetched: number;
  upserted: number;
  skipped: number;
}

export interface RefreshLogger {
  info(message: string, details?: Record<string, unknown>): void;
}

export interface RefreshArxivCacheDependencies {
  client: ArxivFeedClient;
  repositories: Repositories;
  logger?: RefreshLogger;
}
