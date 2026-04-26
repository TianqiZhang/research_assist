import type { ArxivFeedClient, FetchArxivFeedInput } from "./types";

export interface HttpArxivClientOptions {
  baseUrl?: string;
  fetcher?: typeof fetch;
  retries?: number;
}

export class HttpArxivClient implements ArxivFeedClient {
  private readonly baseUrl: string;
  private readonly fetcher: typeof fetch;
  private readonly retries: number;

  constructor(options: HttpArxivClientOptions = {}) {
    this.baseUrl = options.baseUrl ?? "https://export.arxiv.org/api/query";
    this.fetcher = options.fetcher ?? ((input, init) => fetch(input, init));
    this.retries = options.retries ?? 2;
  }

  async fetchFeed(input: FetchArxivFeedInput): Promise<string> {
    const url = buildArxivApiUrl(this.baseUrl, input);
    let lastError: unknown;

    for (let attempt = 0; attempt <= this.retries; attempt += 1) {
      try {
        const response = await this.fetcher(url.toString(), {
          headers: {
            accept: "application/atom+xml, application/xml;q=0.9, text/xml;q=0.8"
          }
        });

        if (response.ok) {
          return response.text();
        }

        const retryable = response.status === 429 || response.status >= 500;

        if (!retryable || attempt === this.retries) {
          throw new Error(`arXiv request failed with status ${response.status}`);
        }
      } catch (error) {
        lastError = error;

        if (attempt === this.retries) {
          break;
        }
      }
    }

    throw lastError instanceof Error ? lastError : new Error("arXiv request failed");
  }
}

export function buildArxivApiUrl(baseUrl: string, input: FetchArxivFeedInput): URL {
  const url = new URL(baseUrl);
  const searchQuery = [
    `cat:${input.category}`,
    `submittedDate:[${formatArxivDate(input.fromDate, "start")} TO ${formatArxivDate(
      input.toDate,
      "end"
    )}]`
  ].join(" AND ");

  url.searchParams.set("search_query", searchQuery);
  url.searchParams.set("start", "0");
  url.searchParams.set("max_results", String(input.maxResults ?? 500));
  url.searchParams.set("sortBy", "submittedDate");
  url.searchParams.set("sortOrder", "descending");

  return url;
}

function formatArxivDate(value: string, boundary: "start" | "end"): string {
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return `${value.replaceAll("-", "")}${boundary === "start" ? "0000" : "2359"}`;
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    throw new Error(`Invalid arXiv date: ${value}`);
  }

  const year = date.getUTCFullYear().toString().padStart(4, "0");
  const month = (date.getUTCMonth() + 1).toString().padStart(2, "0");
  const day = date.getUTCDate().toString().padStart(2, "0");
  const hour = date.getUTCHours().toString().padStart(2, "0");
  const minute = date.getUTCMinutes().toString().padStart(2, "0");

  return `${year}${month}${day}${hour}${minute}`;
}
