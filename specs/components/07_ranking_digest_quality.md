# 07 Ranking, Digest, and Quality Check

## Goal

Select final papers from scored candidates, generate the user-facing digest, and run a bounded quality check before saving or sending.

## Dependencies

- `02_database_repositories`
- `04_assistant_api_profile_compiler`
- `06_llm_scoring`

## Owned Areas

Suggested files and directories:

- `src/domain/ranking.ts`
- `src/domain/digest.ts`
- `src/llm/digestGeneration.ts`
- `src/llm/qualityCheck.ts`
- `src/llm/prompts/digestGeneration.ts`
- `src/llm/prompts/qualityCheck.ts`
- `test/domain/ranking.test.ts`
- `test/llm/digestGeneration.test.ts`

## Scope

Implement:

- Deterministic rank/diversify algorithm.
- Digest generation prompt.
- Markdown digest format.
- Markdown-to-HTML conversion.
- Quality check prompt and validator.
- One-time digest regeneration on quality failure.
- Digest persistence.

Do not implement:

- Email sending.
- Workflow orchestration beyond callable service functions.
- Full PDF claims or full-text summaries.

## Ranking Contract

```ts
type SelectPapersInput = {
  runId: string;
  assistantId: string;
  paperCount: number;
};

type SelectedPaper = {
  arxivId: string;
  rank: number;
  finalScore: number;
  selectionReason: string;
};
```

## Ranking Algorithm

1. Load scored candidates where `should_include = true`.
2. Sort by `final_score` descending.
3. Drop scores below 6.5 unless not enough papers remain.
4. Remove exact or near-exact duplicate titles.
5. Build lightweight topic buckets from matched profile topics and primary arXiv category.
6. Select greedily while limiting each bucket to 2 papers.
7. Fill remaining slots by score if needed.

This step must not call an LLM.

## Digest Format

Markdown body:

```text
# {assistant_name}

Selected from {candidate_count} recent papers.

## 1. {paper_title}

Authors: {authors}
Link: {arxiv_url}

Key idea:
{1-2 sentence summary}

Why this matches:
{1-2 sentence explanation tied to assistant criteria}

Potential limitations:
{1 sentence caveat}
```

The digest must not imply full PDF review.

## Prompt Versioning

Define:

```ts
export const DIGEST_GENERATION_PROMPT_VERSION = "digest-generation-v1";
export const QUALITY_CHECK_PROMPT_VERSION = "quality-check-v1";
```

Store raw outputs for both LLM steps. If no database field exists for digest raw output, add one or store it in digest metadata.

## Quality Check Output

```json
{
  "passed": true,
  "issues": [],
  "suggested_fixes": []
}
```

## Quality Rules

The quality check should verify:

- Digest matches assistant criteria.
- Selected papers are relevant based on title and abstract.
- Summaries are faithful to title and abstract.
- There are no obvious duplicates.
- Email is concise enough.
- Digest does not claim full PDF reading.

If quality fails:

- Regenerate digest once using issues and suggested fixes.
- Run or store the final quality result.
- Never loop more than once.

## Tests

Add tests for:

- Ranking threshold behavior.
- Duplicate title removal.
- Topic bucket diversity.
- Digest contains required sections.
- Quality failure triggers at most one regeneration.
- Digest avoids full-text claims.

## Acceptance Criteria

- Selected papers are deterministic for fixed scores.
- Digest is saved with Markdown and HTML.
- Quality check result is stored.
- Later email workflow can send the saved digest.

## Handoff Notes

Record:

- Exact title similarity method.
- Markdown-to-HTML library used.
- Where digest raw LLM output is stored.

