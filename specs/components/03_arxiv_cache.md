# 03 arXiv Cache

## Goal

Implement arXiv metadata fetching and cache refresh so assistant runs can query recent papers locally without calling arXiv during every workflow step.

## Dependencies

- `01_project_foundation`
- `02_database_repositories`

## Owned Areas

Suggested files and directories:

- `src/arxiv/`
- `src/http/internalArxivRoutes.ts`
- `test/arxiv/`
- `test/fixtures/arxiv/`

## Scope

Implement:

- arXiv API client.
- XML or Atom response parser.
- Paper normalization.
- Cache refresh service.
- Internal manual refresh endpoint or command.
- Tests with mocked arXiv responses.

Do not implement:

- LLM scoring.
- Candidate ranking beyond cache query support.
- Full PDF ingestion.

## arXiv Paper Fields

Normalize each paper into:

```ts
type ArxivPaper = {
  arxivId: string;
  title: string;
  abstract: string;
  authors: string[];
  categories: string[];
  primaryCategory?: string;
  publishedAt: string;
  updatedAt?: string;
  pdfUrl?: string;
  absUrl: string;
  metadata: Record<string, unknown>;
};
```

## Refresh Inputs

```ts
type RefreshArxivCacheInput = {
  categories: string[];
  fromDate: string;
  toDate: string;
  maxResults?: number;
};
```

## Required Behavior

- Fetch papers by category and date window.
- Upsert papers by `arxiv_id`.
- Normalize whitespace in titles and abstracts.
- Deduplicate papers returned across multiple categories.
- Preserve all categories from arXiv metadata.
- Log refresh counts through run events or internal logs.

## Internal Endpoint

### `POST /internal/arxiv/refresh`

Auth:

- Requires `INTERNAL_API_SECRET`.

Request:

```json
{
  "categories": ["cs.AI", "cs.CL"],
  "from_date": "2026-04-01",
  "to_date": "2026-04-25",
  "max_results": 500
}
```

Response:

```json
{
  "fetched": 120,
  "upserted": 118,
  "skipped": 2
}
```

## Error Handling

- Retry transient HTTP failures up to 2 times.
- Treat parse failures for individual entries as skipped papers.
- Fail the refresh if the whole response cannot be parsed.

## Tests

Add tests for:

- Parsing fixture arXiv feed.
- Normalizing titles and abstracts.
- Deduplicating by arXiv ID.
- Upserting the same response twice.
- Internal endpoint rejects missing secret.

## Acceptance Criteria

- Cache can populate at least 100 recent papers from configured categories.
- Re-running refresh does not duplicate rows.
- Later candidate generation can query recent papers by category and date window.

## Handoff Notes

Record:

- Any arXiv API limitations encountered.
- Default category/date-window choices.
- Whether a real integration test was run.

