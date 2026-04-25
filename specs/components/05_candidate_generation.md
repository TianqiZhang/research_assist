# 05 Candidate Generation

## Goal

Implement cheap deterministic candidate generation that reduces the local arXiv paper pool before LLM scoring.

## Dependencies

- `02_database_repositories`
- `03_arxiv_cache`
- `04_assistant_api_profile_compiler`

## Owned Areas

Suggested files and directories:

- `src/domain/candidateGeneration.ts`
- `src/domain/textMatching.ts`
- `test/domain/candidateGeneration.test.ts`
- `test/fixtures/papers.ts`

## Scope

Implement:

- Recent paper query input for assistant runs.
- Deterministic cheap scoring.
- Include/exclude topic matching.
- Candidate reason generation.
- Persistence to `run_candidates`.

Do not implement:

- LLM candidate scoring.
- Digest generation.
- Workflow orchestration except a callable service function.

## Service Contract

```ts
type GenerateCandidatesInput = {
  runId: string;
  assistantId: string;
  profileVersion: number;
  categories: string[];
  fromDate: string;
  toDate: string;
  limit?: number;
};

type GeneratedCandidate = {
  arxivId: string;
  candidateRank: number;
  cheapScore: number;
  candidateReason: string;
};
```

## Scoring Formula

When embeddings are unavailable:

```text
cheap_score =
  0.45 * category_match_score +
  0.35 * keyword_match_score +
  0.20 * recency_score
```

When embeddings are available:

```text
cheap_score =
  0.35 * category_match_score +
  0.30 * keyword_match_score +
  0.20 * recency_score +
  0.15 * embedding_similarity_score
```

MVP may omit embeddings. Keep the function signature flexible enough to add embeddings later.

## Matching Rules

- Match against title and abstract.
- Use normalized lowercase text.
- Count include topic and positive signal matches positively.
- Penalize exclude topic and negative signal matches.
- Prefer configured arXiv categories.
- Prefer newer papers within the date window.

## Candidate Cap

- Default: 60 candidates per run.
- Minimum allowed: 10.
- Maximum allowed: 100.

## Candidate Reason

Generate short deterministic reasons, for example:

```text
Matched include topics: AI agents, tool use. Positive signals: benchmark. Primary category cs.AI.
```

Do not use an LLM for candidate reasons.

## Tests

Add tests for:

- Stable ordering for fixed fixtures.
- Include topics increase score.
- Exclude topics reduce score.
- Recency affects score.
- Candidate cap is enforced.
- Candidate reasons are deterministic.

## Acceptance Criteria

- Service returns stable candidates for fixed inputs.
- Candidates are persisted to `run_candidates`.
- No LLM provider is called.
- Later LLM scoring can consume candidate paper IDs and source metadata.

## Handoff Notes

Record:

- Exact cheap scoring weights used.
- Whether embeddings are included or stubbed.
- Any changes needed in paper repository search.

