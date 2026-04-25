import type { Hono } from "hono";

import { HttpArxivClient, refreshArxivCache } from "../arxiv";
import { hasInternalSecret } from "./auth";
import { resolveRepositories } from "./dependencies";
import { jsonError } from "./errors";
import type { AppBindings, AppOptions } from "./types";

interface RefreshRequestBody {
  categories?: unknown;
  from_date?: unknown;
  to_date?: unknown;
  max_results?: unknown;
}

export function registerInternalArxivRoutes(
  app: Hono<AppBindings>,
  options: AppOptions = {}
): void {
  app.post("/internal/arxiv/refresh", async (c) => {
    if (
      !hasInternalSecret(
        {
          headerSecret: c.req.header("x-internal-api-secret"),
          authorization: c.req.header("authorization"),
          expectedSecret: c.env.INTERNAL_API_SECRET
        }
      )
    ) {
      return jsonError("unauthorized", "Internal API secret is required", 401);
    }

    let body: RefreshRequestBody;

    try {
      body = (await c.req.json()) as RefreshRequestBody;
    } catch {
      return jsonError("bad_request", "Request body must be valid JSON", 400);
    }

    const parsed = parseRefreshRequestBody(body);

    if ("error" in parsed) {
      return jsonError("bad_request", parsed.error, 400);
    }

    const repositories = resolveRepositories(c.env, options);
    const client =
      options.arxivClient ??
      new HttpArxivClient({
        fetcher: options.fetcher
      });
    const result = await refreshArxivCache(parsed.input, {
      client,
      repositories,
      logger: options.logger
    });

    return c.json(result);
  });
}

function parseRefreshRequestBody(
  body: RefreshRequestBody
):
  | {
      input: {
        categories: string[];
        fromDate: string;
        toDate: string;
        maxResults?: number;
      };
    }
  | { error: string } {
  const categories = Array.isArray(body.categories) ? body.categories : undefined;
  const fromDate = typeof body.from_date === "string" ? body.from_date : undefined;
  const toDate = typeof body.to_date === "string" ? body.to_date : undefined;
  const maxResults = body.max_results;
  let parsedMaxResults: number | undefined;

  if (!categories || categories.some((category) => typeof category !== "string")) {
    return { error: "categories must be an array of strings" };
  }

  if (!fromDate) {
    return { error: "from_date is required" };
  }

  if (!toDate) {
    return { error: "to_date is required" };
  }

  if (maxResults !== undefined) {
    if (typeof maxResults !== "number" || !Number.isInteger(maxResults) || maxResults <= 0) {
      return { error: "max_results must be a positive integer when set" };
    }

    parsedMaxResults = maxResults;
  }

  return {
    input: {
      categories,
      fromDate,
      toDate,
      maxResults: parsedMaxResults
    }
  };
}
