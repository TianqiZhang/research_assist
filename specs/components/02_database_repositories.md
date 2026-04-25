# 02 Database Repositories

## Goal

Add database migrations and a typed repository layer for users, assistants, profiles, arXiv papers, runs, candidates, scores, digests, and run events.

## Dependencies

- `01_project_foundation`

## Owned Areas

Suggested files and directories:

- `migrations/`
- `src/db/`
- `src/domain/types.ts`
- `test/db/`
- `test/fixtures/`

## Scope

Implement:

- SQL migrations for core tables.
- TypeScript domain types.
- Supabase client factory.
- Repository functions for core entities.
- Test fixtures for a user, assistant, profile, papers, and run.

Do not implement:

- Candidate generation logic.
- LLM prompt logic.
- Workflow orchestration.
- Email delivery.

## Required Tables

Create migrations for:

- `users`
- `assistants`
- `assistant_profiles`
- `arxiv_papers`
- `assistant_runs`
- `run_events`
- `run_candidates`
- `run_scores`
- `digests`

Use the schema summarized in this spec pack as the baseline.

## Repository Contracts

Expose repository methods equivalent to:

```ts
type Repositories = {
  users: UserRepository;
  assistants: AssistantRepository;
  profiles: AssistantProfileRepository;
  papers: ArxivPaperRepository;
  runs: AssistantRunRepository;
  runEvents: RunEventRepository;
  candidates: RunCandidateRepository;
  scores: RunScoreRepository;
  digests: DigestRepository;
};
```

Minimum methods:

- `assistants.listByUser(userId)`
- `assistants.getById(id)`
- `assistants.create(input)`
- `assistants.update(id, input)`
- `profiles.getLatest(assistantId)`
- `profiles.create(input)`
- `papers.upsertMany(papers)`
- `papers.searchRecent(input)`
- `runs.create(input)`
- `runs.updateStatus(input)`
- `runEvents.append(input)`
- `candidates.insertMany(runId, candidates)`
- `scores.insertMany(runId, scores)`
- `digests.create(input)`
- `digests.getByRunId(runId)`

## Data Rules

- Use arXiv ID as the primary key for papers.
- Keep prompt/profile/workflow versions as explicit strings or integers.
- Store raw model output as JSON.
- Store run events append-only.
- Do not delete run data when later steps fail.

## Tests

Add tests for:

- Migration applies cleanly.
- Assistant create/get/update.
- Profile version insertion and latest lookup.
- Paper upsert idempotency.
- Run status updates.
- Candidate and score insertion.
- Digest creation and lookup.

If integration tests require real Supabase credentials, keep them behind a separate script and provide mocked repository tests by default.

## Acceptance Criteria

- Migrations are committed and documented.
- Repository methods have stable TypeScript types.
- Tests verify idempotent paper upserts.
- Later components can use repositories without writing raw SQL.

## Handoff Notes

Record:

- Any schema deviations from this component spec.
- Whether pgvector is enabled or omitted.
- How to run migrations locally.
