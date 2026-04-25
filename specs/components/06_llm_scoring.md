# 06 LLM Scoring

## Goal

Implement batch LLM scoring of candidate papers against the compiled assistant profile, with structured output validation, bounded retries, and persistence.

## Dependencies

- `02_database_repositories`
- `04_assistant_api_profile_compiler`
- `05_candidate_generation`

## Owned Areas

Suggested files and directories:

- `src/llm/scoring.ts`
- `src/llm/prompts/candidateScoring.ts`
- `src/domain/scoring.ts`
- `test/llm/scoring.test.ts`

## Scope

Implement:

- Candidate scoring prompt.
- Batch construction.
- Structured JSON parsing and validation.
- Retry/repair handling.
- Persistence to `run_scores`.

Do not implement:

- Candidate generation.
- Final ranking and diversification.
- Digest generation.

## Prompt Versioning

Define:

```ts
export const CANDIDATE_SCORING_PROMPT_VERSION = "candidate-scoring-v1";
```

Persist it with every score row.

## Input Contract

```ts
type ScoreCandidatesInput = {
  runId: string;
  assistantId: string;
  profileVersion: number;
  batchSize?: number;
};
```

The service should load:

- Assistant profile.
- Candidate rows.
- Paper metadata for each candidate.

Only pass compact paper data to the LLM:

- arXiv ID
- title
- abstract
- authors
- categories
- published date
- arXiv URL

## LLM Output Schema

```json
{
  "scores": [
    {
      "arxiv_id": "2604.12345",
      "topic_relevance": 8,
      "technical_quality": 7,
      "practical_value": 9,
      "novelty": 6,
      "final_score": 7.8,
      "should_include": true,
      "reason": "Strong match because it introduces a practical agent evaluation benchmark."
    }
  ]
}
```

## Validation Rules

- `scores` must be an array.
- Every returned `arxiv_id` must be in the batch.
- Every candidate in the batch should have exactly one score.
- Integer dimensions must be between 0 and 10.
- `final_score` must be between 0 and 10.
- `reason` must be non-empty and concise.

## Retry Policy

- Retry failed provider calls up to 2 times.
- Retry malformed output up to 2 times.
- If only some candidates are missing, issue one repair prompt for missing IDs.
- If a batch still fails, record a run event and continue if enough candidates remain.

## Persistence

For each valid score, store:

- score dimensions
- final score
- should include
- reason
- raw model output
- prompt version

Do not overwrite existing score rows unless the whole run is explicitly being replayed.

## Tests

Add tests for:

- Batching.
- Valid output parsing.
- Invalid JSON retry.
- Missing candidate repair.
- Out-of-range score rejection.
- Partial batch failure does not delete successful rows.

## Acceptance Criteria

- Candidate batches are scored with validated JSON.
- Raw output and prompt version are persisted.
- Failed batches create useful run events.
- Later ranking can query scored candidates without knowing LLM internals.

## Handoff Notes

Record:

- Default model and temperature if selected.
- Batch size used.
- Any provider-specific response format constraints.

